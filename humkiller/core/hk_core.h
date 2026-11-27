/*
 * HumKiller core: C API shared by the DSP, the audio I/O layer and the SwiftUI app.
 * Plain C so Swift can import it as a bridging header.
 */
#ifndef HK_CORE_H
#define HK_CORE_H

#ifdef __cplusplus
extern "C" {
#endif

#define HK_MAX_HARMONICS 4

#define HK_MODE_MANUAL 0   /* free-running tones, tuned by ear, no mic */
#define HK_MODE_LOCK   1   /* mic hears the room, tones phase-locked to the hum, level/phase by ear */
#define HK_MODE_ANC    2   /* mic sits inside the earcup, everything adapts on its own */

#define HK_ANC_IDLE        0
#define HK_ANC_CALIBRATING 1
#define HK_ANC_RUNNING     2
#define HK_ANC_FAILED      3

#define HK_ANC_ERR_NONE      0
#define HK_ANC_ERR_NO_PATH   1   /* the mic can't hear the headphones */
#define HK_ANC_ERR_NO_HUM    2   /* nothing tonal to cancel at the set frequency */
#define HK_ANC_ERR_NO_INPUT  3

#define HK_FIND_IDLE      0
#define HK_FIND_CAPTURING 1
#define HK_FIND_READY     2

#define HK_TRANSPORT_UNKNOWN   0
#define HK_TRANSPORT_BUILTIN   1
#define HK_TRANSPORT_USB       2
#define HK_TRANSPORT_BLUETOOTH 3
#define HK_TRANSPORT_OTHER     4

typedef struct hk_status {
    int    mode;
    int    armed;
    int    input_active;
    double freq;            /* fundamental the tones are running at right now (PLL-corrected) */
    int    locked;          /* PLL holds the hum */
    int    anc_state;
    int    anc_error;
    int    find_state;
    float  input_rms_db;    /* broadband mic level, dBFS */
    float  dither_floor_db; /* how deep ANC can go with its path-tracking wobble */
} hk_status;

typedef struct hk_harmonic_status {
    float mic_db;           /* tone level the mic hears at this harmonic, dBFS */
    float snr_db;           /* tone vs. the noise right next to it */
    float reduction_db;     /* ANC: residual vs. un-cancelled level (negative = quieter) */
    float out_db;           /* what we're playing, dBFS */
    float out_phase_deg;
    int   anc_active;       /* ANC is working on this harmonic */
} hk_harmonic_status;

typedef struct hk_find_result {
    int    ok;
    double f0;
    float  prominence_db[HK_MAX_HARMONICS]; /* how far each harmonic sticks out of the noise */
} hk_find_result;

/* ---- DSP (hk_core.cpp) ---- */
void hk_init(void);
void hk_set_output_rate(double hz);
void hk_set_input_rate(double hz);
void hk_set_input_active(int active);

/* audio threads */
void hk_render(float* out, int frames, int channels);
void hk_capture(const float* in, int frames, int channels);

/* UI thread */
void hk_set_mode(int mode);
void hk_set_armed(int armed);
void hk_set_fundamental(double hz);
void hk_set_harmonic(int k, int enabled, float level_db, float phase_deg);
void hk_set_master(float gain);
void hk_anc_restart(void);
void hk_get_status(hk_status* out);
void hk_get_harmonic(int k, hk_harmonic_status* out);

/* hum finder: start, poll find_state until READY, then compute (slow-ish, call off the main thread) */
void hk_find_start(void);
void hk_find_compute(hk_find_result* out);

/* ---- audio I/O (hk_audio.cpp) ---- */
int         hk_audio_init(void);            /* 0 on success */
int         hk_device_refresh(void);
int         hk_device_count(int output);
const char* hk_device_name(int output, int idx);
int         hk_device_is_default(int output, int idx);
int         hk_device_transport(int output, int idx);
unsigned    hk_device_clock_domain(int output, int idx);   /* 0 = unknown */
/* idx -1 = system default; in_idx -2 = no mic. 0 on success, else a negative miniaudio result */
int         hk_audio_open(int out_idx, int in_idx);
void        hk_audio_close(void);
double      hk_audio_output_rate(void);
double      hk_audio_input_rate(void);

#ifdef __cplusplus
}
#endif

#endif
