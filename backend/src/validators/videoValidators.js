const { z } = require('zod');

const noShowSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

module.exports = { noShowSchema };
