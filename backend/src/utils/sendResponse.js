/**
 * Uniform success envelope so the frontend always parses the same shape:
 * { success, data | message, meta? }
 */
const sendResponse = (res, { status = 200, data = null, message = null, meta = null }) => {
  const body = { success: true };
  if (data !== null) body.data = data;
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

module.exports = sendResponse;
