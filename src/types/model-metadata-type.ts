export type ModelMetadata = {
  model_name: string;
  window_size: number;
  forecast_horizons_minutes: number[];
  features: string[];
  num_params: number;
  test_metrics: Record<string, { mse: number; mae: number; rmse: number }>;
  unit: string;
  target_value: string;
};
