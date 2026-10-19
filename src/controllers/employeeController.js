const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const EDITABLE = ['first_name', 'last_name', 'email', 'position', 'salary', 'date_of_joining', 'department'];
const pick = (src) => Object.fromEntries(EDITABLE.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));

// When an employee isn't found for this owner, tell apart "doesn't exist" (404) and "belongs to someone else" (403)
async function notOwnedError(eid, userId, action) {
  const exists = await Employee.exists({ _id: eid });
  if (exists) {
    logger.warn('Authorization failed: cross-user access attempt', { userId, employeeId: eid, action });
    return ApiError.forbidden('You do not have permission to access this employee');
  }
  return ApiError.notFound('Employee not found');
}

// GET /api/v1/emp/employees
async function listEmployees(req, res) {
  const employees = await Employee.find({ user: req.user.id }).sort({ created_at: -1 });
  logger.info('Employees listed', { userId: req.user.id, count: employees.length });
  res.status(200).json(employees);
}

// POST /api/v1/emp/employees
async function createEmployee(req, res) {
  const data = pick(req.body);
  const duplicate = await Employee.exists({ user: req.user.id, email: data.email.toLowerCase() });
  if (duplicate) throw ApiError.conflict('You already have an employee with this email');

  const employee = await Employee.create({ ...data, user: req.user.id });
  logger.info('Employee created', { userId: req.user.id, employeeId: employee._id.toString() });
  res.status(201).json({
    status: true,
    message: 'Employee created successfully.',
    employee_id: employee._id,
    employee: employee.toJSON(),
  });
}

// GET /api/v1/emp/employees/:eid
async function getEmployee(req, res) {
  const { eid } = req.params;
  const employee = await Employee.findOne({ _id: eid, user: req.user.id });
  if (!employee) throw await notOwnedError(eid, req.user.id, 'read');
  res.status(200).json(employee);
}

// PUT /api/v1/emp/employees/:eid
async function updateEmployee(req, res) {
  const { eid } = req.params;
  const data = pick(req.body);

  if (data.email) {
    const duplicate = await Employee.exists({ user: req.user.id, email: data.email.toLowerCase(), _id: { $ne: eid } });
    if (duplicate) throw ApiError.conflict('You already have an employee with this email');
  }

  const employee = await Employee.findOneAndUpdate(
    { _id: eid, user: req.user.id },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!employee) throw await notOwnedError(eid, req.user.id, 'update');

  logger.info('Employee updated', { userId: req.user.id, employeeId: eid, fields: Object.keys(data) });
  res.status(200).json({
    status: true,
    message: 'Employee details updated successfully.',
    employee: employee.toJSON(),
  });
}

// DELETE /api/v1/emp/employees?eid=xxx
async function deleteEmployee(req, res) {
  const { eid } = req.query;
  const deleted = await Employee.findOneAndDelete({ _id: eid, user: req.user.id });
  if (!deleted) throw await notOwnedError(eid, req.user.id, 'delete');

  logger.info('Employee deleted', { userId: req.user.id, employeeId: eid });
  res.status(204).send();
}

module.exports = { listEmployees, createEmployee, getEmployee, updateEmployee, deleteEmployee };
