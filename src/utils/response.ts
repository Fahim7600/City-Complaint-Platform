export interface SuccessResponse<T> {
  success: true;
  message: string;
  data?: T;
}

export interface ErrorResponse<E = unknown> {
  success: false;
  message: string;
  errors?: E;
}

export const successResponse = <T>(
  message: string,
  data?: T,
): SuccessResponse<T> => {
  return {
    success: true,
    message,
    data,
  };
};

export const errorResponse = <E>(
  message: string,
  errors?: E,
): ErrorResponse<E> => {
  return {
    success: false,
    message,
    errors,
  };
};
