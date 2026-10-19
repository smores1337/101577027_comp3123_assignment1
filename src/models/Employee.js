const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true, maxlength: 50 },
    last_name: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String, required: true, trim: true, lowercase: true, maxlength: 100,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    position: { type: String, required: true, trim: true, maxlength: 100 },
    salary: { type: Number, required: true, min: [0.01, 'Salary must be a positive number'] },
    date_of_joining: { type: Date, required: true },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    // Owner of this employee record (taken from the JWT, never from the client)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

employeeSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.employee_id = ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Employee', employeeSchema);
