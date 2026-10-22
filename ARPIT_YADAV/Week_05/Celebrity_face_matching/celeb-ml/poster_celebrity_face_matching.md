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
│  & User Photo   │       │ & Bounding Box  │       │ & TTA Embedding │       │ & Gender Subspace│      │ & Visual Twin   │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

#### [01] INPUT — Raw Data
- **Live Webcam Stream or Photo Upload**: Ingests user portrait via real-time camera stream or image file (JPG, PNG, WebP up to 5 MB).
- **Dynamic Dimension Scaling**: Automatically rescales oversized images to a maximum dimension of 1280px to maintain consistent sub-second inference.
- **Reflective Border Padding**: Implements automatic `cv2.BORDER_REFLECT` mirror padding if face margins touch the boundary, eliminating edge-crop detection failures.

#### [02] PROCESS — Prepare Data
- **RetinaFace Sub-Millisecond Detection**: Employs multi-scale feature pyramids to extract precise facial bounding boxes `[x1, y1, x2, y2]`.
- **5-Point Landmark Regression**: Locates critical biometric anchors: left eye, right eye, nose tip, left mouth corner, and right mouth corner.
- **Affine Pose Normalization**: Performs 2D affine geometric transformation to normalize roll, pitch, and yaw rotations into a canonical eye-aligned orientation.

#### [03] AI / ML — Recognize Patterns
- **Deep Metric Learning (Buffalo_l Backbone)**: Passes the aligned 112×112 cropped face through a deep ResNet-based ArcFace feature extractor.
- **512-Dimensional Vector Representation**: Maps complex facial topography, eye spacing, cheekbones, and jaw contours into an $L_2$-normalized 512-D unit hypersphere ($\|v\| = 1$).
- **Test-Time Augmentation (TTA)**: Bilaterally extracts original and horizontally flipped embeddings to compute the fused vector:
  $$v_{\text{fused}} = \frac{v + v_{\text{flip}}}{\|v + v_{\text{flip}}\|}$$
  eliminating unilateral shadows, glare, and camera-angle tilt bias.

#### [04] DECISION — Interpret Result
- **High-Throughput Vector Dot-Product**: Executes fast matrix dot-product similarity ($S = E_{\text{celebs}} \cdot v_{\text{query}}$) against pre-indexed Bollywood and Hollywood celebrity embedding matrices.
- **Automated Gender Subspace Filtering**: Automatically detects user gender via facial biometric classification and filters candidates to ensure relevant lookalike matching.
- **Top-$K$ Nearest Neighbor Ranking**: Sorts candidates in descending similarity order, identifying top industry matches and global lookalikes.

#### [05] OUTPUT — Final Action
- **Threshold-Anchored Biometric Calibration**: Maps raw cosine similarity through the official InsightFace verification boundary ($T = 0.25$):
  $$\text{Score}(\%) = \begin{cases} 
  15.0 + 50.0 \times \left(\frac{\text{sim} - 0.04}{0.25 - 0.04}\right)^{0.85} & \text{if } \text{sim} < 0.25 \\
  65.0 + 33.0 \times \left(\frac{\text{sim} - 0.25}{0.40 - 0.25}\right)^{0.75} & \text{if } \text{sim} \ge 0.25
  \end{cases}$$
- **Interactive Twin Visualizer**: Renders side-by-side comparison with the closest celebrity lookalike, displaying calibrated match percentages, cross-industry breakdown (Bollywood ⭐ vs Hollywood 🎬), and alternative runner-up matches.

---

### 02 — THE ML BEHIND IT

#### 🧬 Concept 1: ArcFace (Additive Angular Margin Loss)
- **What it does & why it's used**: Traditional softmax classification treats classes independently and fails to generalize to unseen faces. ArcFace projects embeddings onto a 512-dimensional hypersphere and introduces an additive angular margin penalty ($m = 0.5$) directly to the target angle $\cos(\theta + m)$.
- **Why it matters**: It exponentially maximizes inter-class angular discrepancy while penalizing intra-class variance. The resulting embedding vectors are purely identity-discriminative, remaining robust against lighting, makeup, facial hair, glasses, and aging.

#### ⚖️ Concept 2: RetinaFace Landmark Alignment & TTA Bilateral Fusion
- **How the model learns or reasons**: Real-world webcam photos suffer from perspective distortion and asymmetric illumination. The single-stage RetinaFace network simultaneously regresses face boundaries, 5 spatial keypoints, and confidence scores.
- **Bilateral Cancellation**: At inference time, horizontal mirror fusion ($v + v_{\text{flip}}$) cancels out unilateral lighting artifacts and lens distortion, yielding a geometrically invariant facial signature.

#### 🎯 Concept 3: Hyperspherical Cosine Similarity & Threshold Calibration
- **How the result is generated**: Because vectors are $L_2$-normalized to unit magnitude ($\|u\|_2 = 1, \|v\|_2 = 1$), cosine similarity simplifies to a dot product:
  $$\text{Sim}(u, v) = u \cdot v = \sum_{i=1}^{512} u_i v_i$$
- **From Geometry to Intuition**: High-dimensional embeddings naturally experience orthogonal clustering (unrelated faces score near 0.04; authentic lookalikes sit around 0.20–0.32). The system anchors the official InsightFace verification threshold ($T = 0.25 \rightarrow 65\%$), ensuring clear differentiation between weak matches and genuine lookalikes.

---

### AI UNVEILED · SEE THE MODEL. UNDERSTAND THE MAGIC.
