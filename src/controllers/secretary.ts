import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import Secretary from "../db/Secretary";
import Student from "../db/Student";
import HttpRequestError from "../models/HttpRequestError";
import Secrets from "../keys/keys.json";
import Subjects from "../db/Subjects";
import Factors from "../db/Factors";

export const postCreateUser: RequestHandler = async (req, res, next) => {
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;
  const email = req.body.email;
  const course = req.body.course;
  const group = req.body.group;
  console.log(
    `${firstName} ${lastName} ${password} ${email} ${course} ${group} ${firstName}`
  );

  try {
    const existsongStudent = await Student.findOne({ email: email });
    console.log("passed user searching");

    if (existsongStudent) {
      const err = new HttpRequestError("Current user already exists", 400);
      throw err;
    }

    const newStudent = new Student({
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: password,
      course: +course,
      group: group,
    });
    console.log(`created user ${newStudent}`);
    const result = await newStudent.save();
    console.log("saved user");
    console.log(`result is ${result}`);
    if (!result) {
      const err = new Error("Ошибка на сервере пользователь не сохранен");
      throw err;
    }

    return res.status(201).json({ message: "User was successfully created" });
  } catch (err) {
    if (!(err instanceof HttpRequestError)) {
      err = new HttpRequestError(err.message, 500);
    }
    return next(err);
  }
};

const getInitialTable: RequestHandler = async (req, res, next) => {
  const subjects = await Subjects.find();
  const factors = await Factors.find();

  if (!subjects || !factors || subjects.length === 0 || factors.length === 0) {
    throw new HttpRequestError("Data was not found", 422);
  }

  const fullArray = [...subjects, ...factors];

  return res.status(200).json({
    subjects: fullArray,
  });
};

export const postSubjectsToSearch: RequestHandler = async (req, res, next) => {
  const subjects = req.body.subjects;
  try {
    const maxAge = 50;
    const multyPlyer = 0.2;
    const students = await Student.find({
      "subjects.id": {
        $in: subjects,
      },
    });

    if (!students || students.length === 0) {
      throw new HttpRequestError("No students were found", 422);
    }

    const studentResults: Array<{ id: string; result: Number }> = [];
    const result = 1;

    return res.status(200).json({ result: result });
  } catch (_err) {
    next(_err);
  }
};

export const getStudents: RequestHandler = async (req, res, next) => {
  //   let groupQuery = (req.query.group ?? "").toString();
  console.log("came to get all student");

  // let group = groupQuery.toString();
  // if (Array.isArray(groupQuery)) {
  //     group = [...groupQuery];
  // }
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

  console.log(`secretary/students - ${allStudents}`);
  //   const students = allStudents.map((item) => {
  //       console.log(`from all users ${item}`);

  //     return {
  //       firstName: item.firstName,
  //       lastName: item.lastName,
  //       id: item.id.toString(),
  //       group: item.group,
  //       course: item.course
  //     };
  //   });

  return res.status(200).json({ students: allStudents });
};

export const getStudentById: RequestHandler = async (req, res, next) => {
  const studentId = req.params.studentId;
  console.log(`studentId is ${studentId}`);

  try {
    const student = await Student.findById(studentId, {
      password: 0,
      email: 0,
    });
    console.log(`student is ${student}`);

    if (!student) {
      throw new HttpRequestError("Student not found", 422);
    }
    console.log(`student is ${student}`);

    const populatedStudent = await student
      .populate("subjects.id")
      .populate("factors.id")
      .execPopulate();

    console.log(`populatedStudent is ${populatedStudent}`);
    console.log(`populatedStudent is ${populatedStudent.subjects[0].id}`);

    return res.status(200).json({
      ...populatedStudent._doc,
    });
  } catch (_err) {
    next(_err);
  }
};