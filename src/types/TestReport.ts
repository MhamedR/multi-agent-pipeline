export type TestingTask = {
  task: string;
};

export type TestReport = {
  passed: boolean;
  summary: string;
  commands: string[];
  failures: string[];
};
