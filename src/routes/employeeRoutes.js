const express = require('express');
const ctrl = require('../controllers/employeeController');
const v = require('../validators/employeeValidators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Every employee route requires a valid JWT
router.use(authenticate);

router
  .route('/employees')
  .get(ctrl.listEmployees)
  .post(v.createEmployeeRules, validate, ctrl.createEmployee)
  .delete(v.eidQueryRules, validate, ctrl.deleteEmployee);

router
  .route('/employees/:eid')
  .get(v.eidParamRules, validate, ctrl.getEmployee)
  .put(v.updateEmployeeRules, validate, ctrl.updateEmployee);

module.exports = router;
