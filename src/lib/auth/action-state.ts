export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fields?: Record<string, string>;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};
