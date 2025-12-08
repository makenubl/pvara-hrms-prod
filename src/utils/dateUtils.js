import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy hh:mm a');
};

export const calculateDaysDifference = (startDate, endDate) => {
  return differenceInDays(new Date(endDate), new Date(startDate)) + 1;
};

export const getMonthlyCalendar = (year, month) => {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
};

export const getWorkingDays = (startDate, endDate) => {
  let count = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current = addDays(current, 1);
  }

  return count;
};

export const getAge = (dateOfBirth) => {
  if (!dateOfBirth) return '';
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

export const getYearsOfService = (joiningDate) => {
  if (!joiningDate) return '';
  const today = new Date();
  const joining = new Date(joiningDate);
  let years = today.getFullYear() - joining.getFullYear();
  const monthDiff = today.getMonth() - joining.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < joining.getDate())) {
    years--;
  }

  return years;
};

export const isUpcomingBirthday = (dateOfBirth, days = 7) => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  
  if (thisYearBirthday < today) {
    thisYearBirthday.setFullYear(today.getFullYear() + 1);
  }

  const daysUntilBirthday = differenceInDays(thisYearBirthday, today);
  return daysUntilBirthday <= days && daysUntilBirthday >= 0;
};

export const getQuarter = (date = new Date()) => {
  const month = new Date(date).getMonth() + 1;
  return Math.ceil(month / 3);
};
