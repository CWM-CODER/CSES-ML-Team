# INNOVATION GARAGE · NIT WARANGAL
## CHROMATIC REFLEX
### Real-Time Vision & Spatial Hand Kinematics Interactive Engine

---

### 01 — HOW DOES IT WORK?
**Follow the complete journey from input to output.**

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    01 INPUT     │  ──▶  │   02 PROCESS    │  ──▶  │   03 AI / ML    │  ──▶  │   04 DECISION   │  ──▶  │    05 OUTPUT    │
│  60 FPS Webcam  │       │ 21-Landmark 3D  │       │ Spatial Vector  │       │ Hysteresis State│       │ Millisecond Game│
│  RGB Video Feed │       │ Skeletal Mesh   │       │ & Kinematics    │       │ Machine Filter  │       │ & Audio Reaction│
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

#### [01] INPUT — Raw Data
- **High-Frequency Video Ingestion**: Streams real-time 60 FPS video capture directly from the user's local camera via HTML5 WebRTC.
- **Aspect Ratio Normalization**: Dynamically tracks camera viewport dimensions ($W \times H$) and adjusts coordinate scales to neutralize wide-angle distortion.

#### [02] PROCESS — Prepare Data
- **BlazePalm Single-Shot Detection**: Runs an ultra-fast palm detector locating the hand bounding envelope and orientation angle across the field of view.
- **21 3D Coordinate Landmarks**: MediaPipe HandLandmark sub-network regresses 21 key skeletal joints $(x, y, z)$ across wrist, MCP, PIP, DIP, and fingertips in normalized camera coordinates.
- **Depth ($Z$) Dimensional Integration**: Leverages relative depth to guarantee tracking stability even during hand yaw and pitch rotations.

#### [03] AI / ML — Recognize Patterns
- **Kinematic Feature Extraction**: Measures spatial Euclidean distances between fingertips and wrist anchors ($d_2, d_3$).
- **Normalized Finger Extension Ratios**: Computes radial ratios:
  $$\text{Ratio} = \frac{\|\text{Tip} - \text{Wrist}\|_2}{\|\text{MCP} - \text{Wrist}\|_2}$$
  to quantitatively evaluate open hand, curled fist, or index finger pointing.
- **Vectorized Pose Directional Analysis**: Calculates vertical unit vectors and angular reach between thumb tip and index knuckle to identify distinctive thumbs-up poses.

#### [04] DECISION — Interpret Result
- **Dual-Threshold Hysteresis State Machine**: Implements decoupled "Enter" and "Stay" trigger thresholds to prevent jitter when fingers waver near classification boundaries:
  $$\text{Threshold}_{\text{Stay}} < \text{Threshold}_{\text{Enter}}$$
- **Confidence Scoring & Temporal Debouncing**: Requires consecutive frame stability before firing game trigger actions, eliminating camera noise or motion blur artifacts.

#### [05] OUTPUT — Final Action
- **Zero-Latency Game Event Dispatch**: Directly updates game loop states (color matching, reflex scoring, multiplier bonuses) under 30ms total response latency.
- **Audio-Visual Feedback & Leaderboard**: Triggers dynamic WebAudio synthesizer sounds and logs high scores locally and to the backend service.

---

### 02 — THE ML BEHIND IT

#### 🖐️ Concept 1: MediaPipe Hands (BlazePalm + Skeletal Regression)
- **What it does & why it's used**: Traditional CNN pixel-level segmentation is far too computationally expensive for real-time in-browser applications. MediaPipe utilizes a two-stage lightweight architecture: a palm detector (BlazePalm) that crops the hand region, followed by a landmark regression model predicting 21 3D coordinates.
- **Why it matters**: It operates at 60+ FPS on client-side CPU/GPU without needing external cloud servers, preserving privacy and enabling instantaneous tactile interaction.

#### 📐 Concept 2: Z-Aware 3D Euclidean Kinematics
- **How the model learns or reasons**: Camera inputs are inherently 2D projections of 3D motion. If a user tilts their hand backwards or forwards, 2D distances between knuckles and fingertips distort.
- **3D Spatial Feature Formulation**: The system calculates 3D Euclidean distances:
  $$\text{Dist}_{3D} = \sqrt{(x_1 - x_2)^2 \cdot \text{Aspect}^2 + (y_1 - y_2)^2 + (z_1 - z_2)^2 \cdot \text{Aspect}^2}$$
  By utilizing the predicted $z$-depth coordinate, finger extension ratios remain invariant to hand orientation and perspective tilting.

#### 🔄 Concept 3: Hysteresis State Machine & Dynamic Thresholding
- **How the result is generated**: Raw model outputs oscillate rapidly between classification borders when a user holds a static pose. A naive single threshold causes rapid "flickering" between states.
- **The Solution**: The engine implements hysteresis with asymmetric thresholds for entering vs. sustaining a gesture:
  - Entering Thumbs-Up: Requires high thumb reach ($>0.75$) and strong verticality ($>0.55$).
  - Sustaining Thumbs-Up: Relaxed to lower thresholds ($>0.60$ and $>0.35$).
  This guarantees rock-solid, fluid user control without accidental drops or missed triggers.

---

### AI UNVEILED · SEE THE MODEL. UNDERSTAND THE MAGIC.
