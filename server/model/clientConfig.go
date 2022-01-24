package model

type ClientConfig struct {
	Telemetry                bool              `json:"telemetry"`
	TelemetryID              string            `json:"telemetryid"`
	EnablePublicSharedBoards bool              `json:"enablePublicSharedBoards"`
	FeatureFlags             map[string]string `json:"featureFlags"`
	MaximumFileSize          int64             `json:"maximum_file_size"`
}
