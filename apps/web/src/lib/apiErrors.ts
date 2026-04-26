import axios from "axios";

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (
    axios.isAxiosError(err) &&
    err.response?.data &&
    typeof err.response.data === "object" &&
    err.response.data !== null &&
    "error" in err.response.data
  ) {
    const msg = (err.response.data as { error: unknown }).error;
    if (typeof msg === "string" && msg.length > 0) {
      return msg;
    }
  }
  return fallback;
}
