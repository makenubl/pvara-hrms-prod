export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[\d\s-+()]{10,}$/;
  return re.test(phone);
};

export const validatePassword = (password) => {
  return password.length >= 8;
};

export const validatePAN = (pan) => {
  const re = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return re.test(pan);
};

export const validateAadhar = (aadhar) => {
  const re = /^[0-9]{12}$/;
  return re.test(aadhar);
};

export const validateEmployeeID = (id) => {
  const re = /^[A-Z0-9]{6,10}$/;
  return re.test(id);
};

export const validateUAN = (uan) => {
  const re = /^[A-Z0-9]{12}$/;
  return re.test(uan);
};

export const validateDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getValidationErrors = (formData, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const value = formData[field];
    const fieldRules = rules[field];

    if (fieldRules.required && !value) {
      errors[field] = `${field} is required`;
    }

    if (value && fieldRules.email && !validateEmail(value)) {
      errors[field] = 'Invalid email address';
    }

    if (value && fieldRules.minLength && value.length < fieldRules.minLength) {
      errors[field] = `Minimum ${fieldRules.minLength} characters required`;
    }

    if (value && fieldRules.maxLength && value.length > fieldRules.maxLength) {
      errors[field] = `Maximum ${fieldRules.maxLength} characters allowed`;
    }

    if (value && fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.message || 'Invalid format';
    }

    if (fieldRules.custom && fieldRules.custom(value)) {
      errors[field] = fieldRules.message || 'Invalid value';
    }
  });

  return errors;
};
