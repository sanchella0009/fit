export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  dietary_mode: 'DORMITORY' | 'FREE';
  webhook_token: string;
  target_calories: number;
  target_protein_g: number;
  target_fat_g: number;
  target_carbs_g: number;
  is_admin: boolean;
  has_dorm_menu_access: boolean;
}

export interface WorkoutExercise {
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  default_weight_kg: number;
}

export interface WorkoutTemplateItem {
  id?: number;
  title: string;
  workout_type: string;
  notes?: string;
  exercises: WorkoutExercise[];
}

export interface ActiveWorkoutSet {
  exercise_name: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  is_completed: boolean;
}
