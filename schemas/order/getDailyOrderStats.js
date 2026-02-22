const Joi = require('joi');

const isoDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
  'string.pattern.base': 'Parameter must be YYYY-MM-DD',
});

const getDailyOrderStats = Joi.object({
  branchId: Joi.number().integer().required().messages({
    'any.required': 'Parameter: branchId is required',
    'number.base': 'Parameter: branchId must be a number',
  }),
  date: isoDate.optional()
    .description('Single day (YYYY-MM-DD). Defaults to today if startDate/endDate not provided'),
  startDate: isoDate.optional()
    .description('Start of date range (YYYY-MM-DD). Use with endDate for table filter'),
  endDate: isoDate.optional()
    .description('End of date range (YYYY-MM-DD). Use with startDate for table filter'),
}).unknown(false);

module.exports = getDailyOrderStats;
