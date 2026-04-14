export interface Player {
  id: number;
  name: string;
  AGG: number;
  TEA: number;
  INS: number;
  VOC: number;
  SPE: number;
}

export interface QuestionOption {
  text: string;
  scores: Record<string, number>;
}

export interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
}

export interface UserScores {
  AGG: number;
  TEA: number;
  INS: number;
  VOC: number;
  SPE: number;
}
