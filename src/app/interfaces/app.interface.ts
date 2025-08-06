export type OmitTyped<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

export interface IDataResponse<T> {
  data: T[];
}