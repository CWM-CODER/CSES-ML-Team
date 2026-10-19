# INNOVATION GARAGE · NIT WARANGAL
## CELEBMATCH AI
### Real-Time Biometric Facial Recognition & Celebrity Lookalike Discovery

---

### 01 — HOW DOES IT WORK?
**Follow the complete journey from input to output.**

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    01 INPUT     │  ──▶  │   02 PROCESS    │  ──▶  │   03 AI / ML    │  ──▶  │   04 DECISION   │  ──▶  │    05 OUTPUT    │
│  Live RGB Frame │       │ Face Alignment  │       │ ArcFace 512-D   │       │ Cosine Search   │       │ Calibrated Match│
│  & User Photo   │       │ & Bounding Box  │       │ & TTA Embedding │       │ & Gender Filter │       │ & Visual Portal │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

#### [01] INPUT — Raw Data
- **Webcam Video Stream or High-Res Image Upload**: Captures unconstrained user selfie or photo (supporting JPG, PNG, WebP up to 5 MB).
- **Adaptive Image Rescaling**: Constrains ultra-high resolution inputs to a maximum dimension of 1280px to maintain deterministic inference latency.
- **Reflective Border Padding**: Applies automatic `cv2.BORDER_REFLECT` mirror padding if the face touches image boundaries, preventing edge cropping failures.

#### [02] PROCESS — Prepare Data
- **RetinaFace Sub-Millisecond Detection**: Scans multi-scale feature pyramids to locate precise face bounding boxes `[x1, y1, x2, y2]`.
- **5-Point Landmark Extraction**: Accurately pinpoints facial keypoints (left eye, right eye, nose tip, left mouth corner, right mouth corner).
- **Affine Pose Alignment**: Normalizes roll, pitch, and yaw rotations via 2D affine transformation, standardizing eye horizontal lines and crop symmetry.

#### [03] AI / ML — Recognize Patterns
- **Deep Metric Learning (Buffalo_l Backbone)**: Passes the aligned 112×112 cropped face through a deep ResNet-based ArcFace feature extractor.
- **512-Dimensional Vector Representation**: Compresses complex facial geometry, eye spacing, cheekbone structure, and jawlines into an $L_2$-normalized 512-dimensional unit sphere hyperspace ($\|v\| = 1$).
- **Test-Time Augmentation (TTA)**: Feeds both original and horizontally mirrored frames to compute a fused vector $v_{\text{fused}} = \frac{v + v_{\text{flip}}}{\|v + v_{\text{flip}}\|}$, removing lighting asymmetry and camera-angle bias.

#### [04] DECISION — Interpret Result
- **High-Throughput Vector Dot-Product**: Computes vector similarity against pre-computed indexed celebrity embeddings across Bollywood and Hollywood databases ($S = E_{\text{celebs}} \cdot v_{\text{query}}$).
- **Demographic Subspace Partitioning**: Runs automated gender classification and applies subspace filtering (Male, Female, or All) to enforce relevant lookalike candidates.
- **Top-$K$ Nearest Neighbor Ranking**: Selects the highest similarity score celebrities within each cinema category and across the global pool.

#### [05] OUTPUT — Final Action
- **Non-Linear Lookalike Score Calibration**: Maps raw cosine similarity (typically 0.05 to 0.45) through an empirical calibration power curve:
  $$\text{Score}(\%) = 30.0 + 68.0 \times \left(\frac{\text{sim} - 0.04}{0.46 - 0.04}\right)^{0.70}$$
- **Interactive Web Interface**: Delivers side-by-side photo comparison with the celebrity twin, match percentage, and cross-industry breakdown (Bollywood ⭐ vs Hollywood 🎬).

---

### 02 — THE ML BEHIND IT

#### 🧬 Concept 1: ArcFace (Additive Angular Margin Loss)
- **What it does & why it's used**: Standard cross-entropy classification treats classes independently and fails to generalize to unseen faces. ArcFace projects face embeddings onto a 512-dimensional hypersphere and introduces an additive angular margin penalty ($m = 0.5$) directly to the target angle $\cos(\theta + m)$.
- **Why it matters**: It exponentially maximizes inter-class angular discrepancy while penalizing intra-class variance. The resulting embedding vectors are purely identity-discriminative, remaining robust against changes in facial hair, lighting, makeup, glasses, and aging.

#### ⚖️ Concept 2: Test-Time Augmentation (TTA) & Geometric Alignment
- **How the model learns or reasons**: Facial images captured via webcams often suffer from unilateral glare, focal distortion, and slight head tilts. The system uses a multi-task RetinaFace network that simultaneously predicts face confidence, bounding boxes, and 5 facial landmarks.
- **Bilateral Fusion**: During inference, the pipeline performs horizontal flip augmentation:
  $$v_{\text{final}} = \frac{v_{\text{original}} + v_{\text{flipped}}}{\|v_{\text{original}} + v_{\text{flipped}}\|}$$
  This bilateral cancellation balances asymmetric shadows and tilt artifacts, yielding an invariant facial signature.

#### 🎯 Concept 3: Hyperspherical Cosine Similarity & Non-Linear Calibration
- **How the result is generated**: Since all facial embedding vectors are normalized to unit magnitude ($\|u\|_2 = 1, \|v\|_2 = 1$), the cosine similarity is simplified to a dot product:
  $$\text{Sim}(u, v) = u \cdot v = \sum_{i=1}^{512} u_i v_i$$
- **From Geometry to Intuition**: High-dimensional embeddings in 512-D space naturally experience orthogonal clustering (random pairs score near 0.04; authentic lookalikes score around 0.25–0.40). The non-linear power-law transform re-scales these narrow geometric margins into an intuitive, human-understandable 0–99% lookalike percentage.

---

### AI UNVEILED · SEE THE MODEL. UNDERSTAND THE MAGIC.
