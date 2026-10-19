const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String, required: [true, 'Username is required'], unique: true,
      trim: true, minlength: 3, maxlength: 30,
    },
    email: {
      type: String, required: [true, 'Email is required'], unique: true,
      trim: true, lowercase: true, maxlength: 100,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    // Stored as a bcrypt hash. select:false means it is never returned unless explicitly requested.
    password: { type: String, required: [true, 'Password is required'], select: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
