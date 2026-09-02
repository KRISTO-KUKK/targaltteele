type LogDetails = Record<string, unknown>;

function format(message: string, details?: LogDetails) {
  if (!details) return message;
  return `${message} ${JSON.stringify(details)}`;
}

export function debug(message: string, details?: LogDetails) {
  if (process.env.LOG_LEVEL === "debug") {
    console.info(format(message, details));
  }
}

export function info(message: string, details?: LogDetails) {
  console.info(format(message, details));
}

export function warn(message: string, details?: LogDetails) {
  console.warn(format(message, details));
}
