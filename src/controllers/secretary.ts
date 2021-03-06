import { RequestHandler } from "express";
import Student, { IStudent } from "../db/Student";
import Professions from "../db/Professions";
import HttpRequestError from "../models/HttpRequestError";
import Subjects from "../db/Subjects";
import Factors from "../db/Factors";

export const postCreateUser: RequestHandler = async (req, res, next) => {
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;
  const email = req.body.email;
  const course = req.body.course;
  const group = req.body.group;

  try {
    const existsongStudent = await Student.findOne({ email: email });
    console.log("passed user searching");

    if (existsongStudent) {
      const err = new HttpRequestError("Current user already exists", 400);
      throw err;
    }

    //temp logic remove it.
    const user = await Student.findOne();

    const newStudent = new Student({
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: password,
      course: +course,
      group: group,
      subjects: user?.subjects,
      factors: user?.factors,
    });

    const result = await newStudent.save();

    if (!result) {
      const err = new Error("Ошибка на сервере пользователь не сохранен");
      throw err;
    }

    return res.status(201).json({ message: "User was successfully created" });
  } catch (err) {
    return next(err);
  }
};

export const getInitialSuitableTable: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const subjects = await Subjects.find();
    const factors = await Factors.find();

    const professionArray = await Professions.find();
    const professionArrayPopulated = await Promise.all(
      professionArray.map(async (item) => {
        const populatedObject = await item.populate("subjects");
        // console.log(`populatedObject is ${populatedObject}`);
        console.log(`populatedObject._doc is ${populatedObject._doc.name}`);

        return populatedObject._doc;
      })
    );
    console.log(professionArrayPopulated);
    if (
      !subjects ||
      !factors ||
      subjects.length === 0 ||
      factors.length === 0
    ) {
      throw new HttpRequestError("Дынне не были найдены", 404);
    }

    const fullArray = [...subjects]; // , ...factors

    return res.status(200).json({
      subjects: fullArray,
      variants: professionArrayPopulated,
    });
  } catch (_err) {
    next(_err);
  }
};

// доработать функционал
export const postSubjectsToSearch: RequestHandler = async (req, res, next) => {
  const subjectsFactors = req.body.subjects;

  try {
    const multyPlyer = 0.2;
    const students = await Promise.all(
      (
        await Student.find()
      ).map(async (item) => await Student.populateAll(item.id))
    );

    if (!students || students.length === 0) {
      throw new HttpRequestError("Ни один студен не найден", 404);
    }

    let data: { student: IStudent; result: number }[] = [];

    students.forEach((item, index) => {
      data.push({ student: item, result: 0 });
      item.subjects.forEach((item) => {
        if (subjectsFactors.includes(item.subject.name)) {
          data[index].result += +item.mark * multyPlyer;
        }
      });

      data[index].result = Math.sqrt(data[index].result);
    });

    data.sort((item1, item2) => {
      return item1.result > item2.result ? 1 : -1;
    });
    return res.status(200).json({ result: data });
  } catch (_err) {
    next(_err);
  }
};

export const getStudents: RequestHandler = async (req, res, next) => {
  //   let groupQuery = (req.query.group ?? "").toString();

  try {
    const allStudents = await Student.find(
      {},
      {
        firstName: 1,
        lastName: 1,
        email: 1,
        course: 1,
        group: 1,
      }
    );

    if (!allStudents || allStudents.length === 0) {
      throw new HttpRequestError("Не найдены студенты", 404);
    }

    return res.status(200).json({ students: allStudents });
  } catch (_err) {
    next(_err);
  }
};

export const getStudentById: RequestHandler = async (req, res, next) => {
  const studentId = req.params.studentId;

  try {
    const student = await Student.findById(studentId, {
      password: 0,
      email: 0,
    });

    // console.log(student);
    console.log(`student id is ${studentId}`);

    if (!student) {
      throw new HttpRequestError("Student not found", 422);
    }

    const populatedStudent = await Student.populateAll(studentId, {
      password: 0,
      email: 0,
    });

    console.log(`populated Student is ${populatedStudent}`);
    

    return res.status(200).json({
      ...populatedStudent,
    });
  } catch (_err) {
    next(_err);
  }
};

// Update

export const updateFactorById: RequestHandler = async (req, res, next) => {
  const id = req.params.id;
  const name = req.body.name;

  try {
    const factor = await Factors.findById(id);

    if (!factor) {
      throw new HttpRequestError("Factor was not found", 404);
    }

    await factor
      .update({
        name: name,
      })
      .exec();

    return res.status(204).json({
      message: "Данные были успешно обновлены",
    });
  } catch (_err) {
    next(_err);
  }
};

export const updateSubjectById: RequestHandler = async (req, res, next) => {
  const id = req.params.id;
  const name = req.body.name;

  try {
    const subject = await Subjects.findByIdAndUpdate(id, {
      name: name,
    }).exec();

    if (!subject) {
      throw new HttpRequestError("Document is not updated", 404);
    }

    return res.status(204).json({
      message: "Предмет был обновлен",
    });
  } catch (_err) {
    next(_err);
  }
};

export const updateManySubjects: RequestHandler = async (req, res, next) => {
  const objMap = req.body.map;
  const keys = Array.from(objMap.keys());

  try {
    const subjects = await Subjects.find({
      $where: function () {
        return keys.includes(this._id);
      },
    });

    if (subjects.length === 0) {
      throw new HttpRequestError("No subjects were found", 404);
    }

    keys.forEach(async (key: any) => {
      const subject = subjects.find((subject) => subject.id === key);
      const result = await subject
        ?.update({
          name: objMap[key].name,
        })
        .exec();

      if (!result) {
        throw new HttpRequestError("Не смогли обновить объект", 500);
      }
    });

    return res.status(204).json({
      message: "Предмет был обновлен",
    });
  } catch (_err) {
    next(_err);
  }
};
