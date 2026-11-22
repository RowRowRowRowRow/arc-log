// ===== Exercise / machine library =====
// No official ARC equipment inventory is published, so this is a starter list of
// the machines and stations found in a large university rec center. Hide anything
// that isn't at the ARC and add your own from the Machines tab.

const AREAS = {
  free: 'Free Weights & Racks',
  plate: 'Plate-Loaded Machines',
  pin: 'Pin-Select Machines',
  cable: 'Cable Stations',
  smith: 'Smith Machine',
  bw: 'Bodyweight & Core',
};

const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'];

// inc = suggested jump in lb when you earn a weight increase. 0 = bodyweight (log added weight).
// p = primary muscle, s = secondary muscles
const EXERCISES = [
  // ---- Free weights & racks ----
  { id: 'bb_bench', name: 'Barbell Bench Press', area: 'free', p: 'Chest', s: ['Triceps', 'Shoulders'], inc: 5,
    cues: ['Shoulder blades pinched and down, slight arch, feet planted', 'Lower to mid/low chest, elbows ~45-70°', 'Press up and slightly back toward the rack', 'Use a spotter or safety arms for heavy sets'] },
  { id: 'bb_incline', name: 'Incline Barbell Bench', area: 'free', p: 'Chest', s: ['Shoulders', 'Triceps'], inc: 5,
    cues: ['Bench at 30-45°', 'Touch the upper chest just below the collarbone', 'Keep wrists stacked over elbows'] },
  { id: 'db_bench', name: 'Dumbbell Bench Press', area: 'free', p: 'Chest', s: ['Triceps', 'Shoulders'], inc: 5,
    cues: ['Kick dumbbells up off your knees to get set', 'Get a deep stretch at the bottom, elbows slightly tucked', 'Press up and in without clanking the dumbbells'] },
  { id: 'db_incline', name: 'Incline Dumbbell Press', area: 'free', p: 'Chest', s: ['Shoulders', 'Triceps'], inc: 5,
    cues: ['Bench at 30°: steeper turns it into a shoulder press', 'Lower until you feel a stretch across the upper chest', 'Control the negative for 2-3 s'] },
  { id: 'bb_ohp', name: 'Overhead Press (Barbell)', area: 'free', p: 'Shoulders', s: ['Triceps'], inc: 5,
    cues: ['Squeeze your glutes and brace hard, no leaning back', 'Bar path straight up, head moves back then through', 'Lock out with the bar over your mid-foot'] },
  { id: 'db_shoulder', name: 'Seated Dumbbell Shoulder Press', area: 'free', p: 'Shoulders', s: ['Triceps'], inc: 5,
    cues: ['Back rest upright or one notch down', 'Lower to about ear level', 'Press up and slightly in'] },
  { id: 'db_lateral', name: 'Dumbbell Lateral Raise', area: 'free', p: 'Shoulders', s: [], inc: 5,
    cues: ['Slight forward lean, soft elbows', 'Lead with the elbows, raise to shoulder height', 'Go light; strict reps beat swinging'] },
  { id: 'db_rear_fly', name: 'Bent-Over Rear Delt Fly', area: 'free', p: 'Shoulders', s: ['Back'], inc: 5,
    cues: ['Hinge until your torso is nearly parallel to the floor', 'Sweep the arms out wide, think "pull apart"', 'Don\'t shrug; keep the traps quiet'] },
  { id: 'bb_squat', name: 'Barbell Back Squat', area: 'free', p: 'Quads', s: ['Glutes'], inc: 5,
    cues: ['Bar on the upper traps, brace your core 360° before each rep', 'Knees track over toes, sit between your hips', 'Hit at least parallel, drive up through the whole foot', 'Set the safety pins just below your bottom position'] },
  { id: 'bb_front_squat', name: 'Front Squat', area: 'free', p: 'Quads', s: ['Glutes', 'Abs'], inc: 5,
    cues: ['Bar on the front delts, elbows high', 'Stay upright, sit straight down', 'If wrists hurt, use a cross-arm grip or straps'] },
  { id: 'bb_deadlift', name: 'Deadlift', area: 'free', p: 'Hamstrings', s: ['Glutes', 'Back'], inc: 10,
    cues: ['Bar over mid-foot, shins touch the bar', 'Pull the slack out of the bar and brace before it leaves the floor', 'Push the floor away, keep the bar dragging up your legs', 'Neutral spine: never round under load'] },
  { id: 'bb_rdl', name: 'Romanian Deadlift', area: 'free', p: 'Hamstrings', s: ['Glutes', 'Back'], inc: 5,
    cues: ['Soft knees, push your hips straight back', 'Bar stays close to your thighs', 'Stop when your hamstrings are fully stretched (usually mid-shin)'] },
  { id: 'bb_row', name: 'Barbell Row', area: 'free', p: 'Back', s: ['Biceps'], inc: 5,
    cues: ['Hinge to ~45°, back flat', 'Pull the bar to your lower ribs/belly button', 'Squeeze your shoulder blades, no body English'] },
  { id: 'db_row', name: 'One-Arm Dumbbell Row', area: 'free', p: 'Back', s: ['Biceps'], inc: 5,
    cues: ['Hand and knee on the bench, flat back', 'Pull the elbow toward your hip, not straight up', 'Full stretch at the bottom'] },
  { id: 'db_shrug', name: 'Dumbbell Shrug', area: 'free', p: 'Back', s: [], inc: 5,
    cues: ['Shrug straight up toward the ears', 'Pause 1 s at the top', 'No rolling the shoulders'] },
  { id: 'bb_hip_thrust', name: 'Barbell Hip Thrust', area: 'free', p: 'Glutes', s: ['Hamstrings'], inc: 10,
    cues: ['Upper back on the bench edge, bar pad on the hips', 'Chin tucked, ribs down', 'Drive through the heels to full lockout, pause 1 s'] },
  { id: 'db_bulgarian', name: 'Bulgarian Split Squat', area: 'free', p: 'Quads', s: ['Glutes'], inc: 5,
    cues: ['Rear foot on the bench, front foot far enough forward', 'Drop the back knee straight down', 'Lean forward slightly for more glute, upright for more quad'] },
  { id: 'db_lunge', name: 'Walking Lunge', area: 'free', p: 'Quads', s: ['Glutes'], inc: 5,
    cues: ['Long steps, back knee kisses the floor', 'Drive through the front heel', 'Log reps per leg'] },
  { id: 'ez_curl', name: 'EZ-Bar Curl', area: 'free', p: 'Biceps', s: [], inc: 5,
    cues: ['Elbows pinned to your sides', 'Full range: straight arm to full squeeze', 'Lower slowly, no swinging'] },
  { id: 'db_curl', name: 'Dumbbell Curl', area: 'free', p: 'Biceps', s: [], inc: 5,
    cues: ['Rotate the palms up as you curl', 'Alternate or do both at once', 'Control the bottom'] },
  { id: 'db_hammer', name: 'Hammer Curl', area: 'free', p: 'Biceps', s: [], inc: 5,
    cues: ['Neutral (thumbs-up) grip', 'Hits the brachialis and forearms', 'Keep the elbows still'] },
  { id: 'db_incline_curl', name: 'Incline Dumbbell Curl', area: 'free', p: 'Biceps', s: [], inc: 5,
    cues: ['Bench at 45-60°, arms hanging behind you', 'Big stretch on the long head', 'Go lighter than a standing curl'] },
  { id: 'ez_skull', name: 'EZ-Bar Skull Crusher', area: 'free', p: 'Triceps', s: [], inc: 5,
    cues: ['Lower the bar behind your head, not to your forehead', 'Upper arms angled slightly back', 'Elbows stay narrow'] },

  // ---- Plate-loaded ----
  { id: 'pl_chest_press', name: 'Plate-Loaded Chest Press', area: 'plate', p: 'Chest', s: ['Triceps', 'Shoulders'], inc: 10,
    cues: ['Set the seat so the handles line up with mid-chest', 'Shoulder blades back into the pad', 'Can be done one arm at a time'] },
  { id: 'pl_incline_press', name: 'Plate-Loaded Incline Press', area: 'plate', p: 'Chest', s: ['Shoulders', 'Triceps'], inc: 10,
    cues: ['Handles start around upper-chest height', 'Chest up, don\'t let the shoulders roll forward', 'Deep stretch, then drive'] },
  { id: 'pl_shoulder_press', name: 'Plate-Loaded Shoulder Press', area: 'plate', p: 'Shoulders', s: ['Triceps'], inc: 10,
    cues: ['Handles start at about chin height', 'Back flat on the pad', 'Press to near lockout'] },
  { id: 'pl_iso_row', name: 'Iso-Lateral Row (Plate)', area: 'plate', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Chest on the pad the whole time', 'Pull the elbows back past your torso', 'Try one arm at a time to fix imbalances'] },
  { id: 'pl_high_row', name: 'High Row (Plate)', area: 'plate', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Thigh pad snug', 'Pull down and back toward the hips', 'Big stretch at the top'] },
  { id: 'pl_low_row', name: 'Low Row (Plate)', area: 'plate', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Chest up against the pad', 'Pull to the belly, squeeze the mid-back', 'Let the shoulders reach forward at the start'] },
  { id: 'pl_pulldown', name: 'Front Pulldown (Plate)', area: 'plate', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Lock your legs under the pad', 'Drive the elbows down to your sides', 'Control the way up'] },
  { id: 'pl_tbar', name: 'Chest-Supported T-Bar Row', area: 'plate', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Chest on the pad, feet on the platform', 'Wide grip for upper back, close grip for lats', 'Squeeze 1 s at the top'] },
  { id: 'leg_press', name: '45° Leg Press', area: 'plate', p: 'Quads', s: ['Glutes'], inc: 10,
    cues: ['Feet shoulder-width mid-platform; higher hits more glutes/hams', 'Lower until your hips are about to curl off the pad', 'Don\'t lock the knees hard at the top'] },
  { id: 'hack_squat', name: 'Hack Squat', area: 'plate', p: 'Quads', s: ['Glutes'], inc: 10,
    cues: ['Back flat on the pad, feet mid-platform', 'Go deep: knees past toes is fine here', 'Push through the whole foot'] },
  { id: 'pl_seated_calf', name: 'Seated Calf Raise', area: 'plate', p: 'Calves', s: [], inc: 10,
    cues: ['Pad snug on the lower thighs', 'Full stretch at the bottom, pause 1-2 s', 'Rise all the way up onto the big toe'] },

  // ---- Pin-select machines ----
  { id: 'm_chest_press', name: 'Chest Press Machine', area: 'pin', p: 'Chest', s: ['Triceps', 'Shoulders'], inc: 10,
    cues: ['Handles at mid-chest height', 'Shoulders down and back', 'Stable, so it\'s a great place to push close to failure'] },
  { id: 'm_pec_fly', name: 'Pec Deck / Chest Fly', area: 'pin', p: 'Chest', s: [], inc: 10,
    cues: ['Slight bend in the elbows, held constant', 'Stretch wide, squeeze hands together', 'Chest up, don\'t let the shoulders roll forward'] },
  { id: 'm_rear_delt', name: 'Reverse Pec Deck (Rear Delt)', area: 'pin', p: 'Shoulders', s: ['Back'], inc: 5,
    cues: ['Face the pad, handles at shoulder height', 'Sweep the arms back in an arc', 'Lead with the pinkies; no shrugging'] },
  { id: 'm_shoulder_press', name: 'Shoulder Press Machine', area: 'pin', p: 'Shoulders', s: ['Triceps'], inc: 10,
    cues: ['Seat so the handles start near chin height', 'Press up, don\'t arch off the pad'] },
  { id: 'm_lateral', name: 'Lateral Raise Machine', area: 'pin', p: 'Shoulders', s: [], inc: 5,
    cues: ['Line up your shoulder joint with the pivot point', 'Push with the elbows, raise to shoulder height', 'Slow negatives'] },
  { id: 'm_lat_pulldown', name: 'Lat Pulldown', area: 'pin', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Grip a bit wider than shoulder-width', 'Lean back slightly, pull the bar to the upper chest', 'Think "elbows to back pockets"', 'Full stretch at the top'] },
  { id: 'm_seated_row', name: 'Seated Row Machine', area: 'pin', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Chest pad set so you get a full stretch', 'Pull the elbows back, squeeze the shoulder blades'] },
  { id: 'm_assist_pullup', name: 'Assisted Pull-Up Machine', area: 'pin', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Log the ASSIST weight; less assist = progress', 'Full hang to chin over the bar', 'Drop assist by 10 lb when you hit the top of your rep range'] },
  { id: 'm_leg_ext', name: 'Leg Extension', area: 'pin', p: 'Quads', s: [], inc: 10,
    cues: ['Knee lined up with the machine pivot', 'Pad on the lower shin', 'Squeeze 1 s at the top, slow down'] },
  { id: 'm_seated_curl', name: 'Seated Leg Curl', area: 'pin', p: 'Hamstrings', s: [], inc: 10,
    cues: ['Knee lined up with the pivot, thigh pad tight', 'Lean your torso forward slightly for a bigger stretch', 'Curl all the way, control up'] },
  { id: 'm_lying_curl', name: 'Lying Leg Curl', area: 'pin', p: 'Hamstrings', s: [], inc: 10,
    cues: ['Hips pressed into the pad', 'Pad just above the heels', 'Don\'t let the hips lift'] },
  { id: 'm_adductor', name: 'Hip Adductor', area: 'pin', p: 'Glutes', s: [], inc: 10,
    cues: ['Start with a comfortable stretch', 'Squeeze the legs together, slow return'] },
  { id: 'm_abductor', name: 'Hip Abductor', area: 'pin', p: 'Glutes', s: [], inc: 10,
    cues: ['Lean forward slightly to bias the glutes', 'Push out, pause, control in'] },
  { id: 'm_standing_calf', name: 'Standing Calf Raise', area: 'pin', p: 'Calves', s: [], inc: 10,
    cues: ['Balls of the feet on the edge', 'Deep stretch, pause at the bottom', 'Straight knees'] },
  { id: 'm_preacher', name: 'Preacher Curl Machine', area: 'pin', p: 'Biceps', s: [], inc: 5,
    cues: ['Armpits snug on the pad', 'Don\'t let the weight yank you at the bottom', 'Squeeze at the top'] },
  { id: 'm_tri_ext', name: 'Tricep Extension / Dip Machine', area: 'pin', p: 'Triceps', s: ['Chest'], inc: 10,
    cues: ['Elbows tucked', 'Press to full lockout', 'Stay upright for more triceps'] },
  { id: 'm_ab_crunch', name: 'Ab Crunch Machine', area: 'pin', p: 'Abs', s: [], inc: 10,
    cues: ['Curl the ribs toward the hips', 'Don\'t pull with the arms', 'Exhale hard at the bottom'] },

  // ---- Cables ----
  { id: 'c_row', name: 'Seated Cable Row', area: 'cable', p: 'Back', s: ['Biceps'], inc: 10,
    cues: ['Tall chest, slight knee bend', 'Pull the handle to the belly', 'Let the shoulders reach forward on the stretch, keep the lower back still'] },
  { id: 'c_face_pull', name: 'Face Pull', area: 'cable', p: 'Shoulders', s: ['Back'], inc: 5,
    cues: ['Rope at upper-chest to forehead height', 'Pull toward your face, elbows high', 'Finish with hands beside your ears (external rotation)'] },
  { id: 'c_lateral', name: 'Cable Lateral Raise', area: 'cable', p: 'Shoulders', s: [], inc: 5,
    cues: ['Cable at the lowest setting, handle crossing behind or in front of you', 'Constant tension: better than dumbbells at the bottom', 'One arm at a time'] },
  { id: 'c_pushdown', name: 'Tricep Pushdown', area: 'cable', p: 'Triceps', s: [], inc: 5,
    cues: ['Elbows pinned to your sides', 'Rope: spread the ends at the bottom', 'Full lockout, controlled up'] },
  { id: 'c_oh_ext', name: 'Overhead Cable Tricep Extension', area: 'cable', p: 'Triceps', s: [], inc: 5,
    cues: ['Face away from the stack, rope behind your head', 'Big stretch on the long head', 'Elbows point forward, don\'t flare'] },
  { id: 'c_fly', name: 'Cable Fly / Crossover', area: 'cable', p: 'Chest', s: [], inc: 5,
    cues: ['Pulleys at shoulder height, or low for upper chest', 'Hug a big tree, slight elbow bend', 'Squeeze the hands together'] },
  { id: 'c_curl', name: 'Cable Curl', area: 'cable', p: 'Biceps', s: [], inc: 5,
    cues: ['Bar or rope from the low pulley', 'Elbows still', 'Constant tension through the full range'] },
  { id: 'c_straight_pd', name: 'Straight-Arm Pulldown', area: 'cable', p: 'Back', s: [], inc: 5,
    cues: ['Hinge forward slightly, arms nearly straight', 'Sweep the bar or rope down to your thighs', 'Feel the lats, not the triceps'] },
  { id: 'c_crunch', name: 'Cable Crunch', area: 'cable', p: 'Abs', s: [], inc: 5,
    cues: ['Kneel, rope beside your head', 'Crunch the ribs to the pelvis; hips stay still', 'Slow up'] },

  // ---- Smith ----
  { id: 'smith_incline', name: 'Smith Incline Press', area: 'smith', p: 'Chest', s: ['Shoulders', 'Triceps'], inc: 5,
    cues: ['Bench at 30°, bar touches the upper chest', 'Set the safety stops', 'Great for pushing close to failure safely'] },
  { id: 'smith_squat', name: 'Smith Machine Squat', area: 'smith', p: 'Quads', s: ['Glutes'], inc: 5,
    cues: ['Feet slightly forward of the bar', 'Sit straight down, deep', 'Set the safety stops'] },

  // ---- Bodyweight & core ----
  { id: 'bw_pullup', name: 'Pull-Up / Chin-Up', area: 'bw', p: 'Back', s: ['Biceps'], inc: 0,
    cues: ['Dead hang to chin over the bar', 'Log added weight (0 if bodyweight)', 'Use the assisted machine until you can do 6+ reps'] },
  { id: 'bw_dip', name: 'Dips', area: 'bw', p: 'Chest', s: ['Triceps', 'Shoulders'], inc: 0,
    cues: ['Lean forward for chest, stay upright for triceps', 'Lower until your shoulders are just below your elbows', 'Log added weight'] },
  { id: 'bw_hanging_leg', name: 'Hanging Leg Raise', area: 'bw', p: 'Abs', s: [], inc: 0,
    cues: ['Curl the pelvis up, don\'t just lift the legs', 'No swinging', 'Bend the knees to make it easier'] },
  { id: 'bw_back_ext', name: '45° Back Extension', area: 'bw', p: 'Glutes', s: ['Hamstrings', 'Back'], inc: 0,
    cues: ['Pad just below the hip crease', 'Round slightly and squeeze the glutes to come up (glute bias)', 'Hold a plate to progress'] },
  { id: 'bw_plank', name: 'Plank (seconds)', area: 'bw', p: 'Abs', s: [], inc: 0,
    cues: ['Log seconds in the reps box', 'Squeeze the glutes, ribs down', 'Straight line from head to heels'] },
];

// ===== Default PPL x UL templates =====
// lo/hi = rep range, rest = seconds
const DEFAULT_TEMPLATES = {
  push: { name: 'Push', focus: 'Chest · Shoulders · Triceps', items: [
    { ex: 'bb_bench', sets: 3, lo: 5, hi: 8, rest: 180 },
    { ex: 'db_incline', sets: 3, lo: 8, hi: 12, rest: 120 },
    { ex: 'm_shoulder_press', sets: 3, lo: 8, hi: 12, rest: 120 },
    { ex: 'c_lateral', sets: 3, lo: 12, hi: 15, rest: 60 },
    { ex: 'c_pushdown', sets: 3, lo: 10, hi: 12, rest: 60 },
    { ex: 'c_oh_ext', sets: 2, lo: 12, hi: 15, rest: 60 },
  ]},
  pull: { name: 'Pull', focus: 'Back · Rear Delts · Biceps', items: [
    { ex: 'm_lat_pulldown', sets: 3, lo: 8, hi: 12, rest: 120 },
    { ex: 'pl_tbar', sets: 3, lo: 8, hi: 12, rest: 120 },
    { ex: 'c_row', sets: 3, lo: 10, hi: 12, rest: 90 },
    { ex: 'c_face_pull', sets: 3, lo: 12, hi: 15, rest: 60 },
    { ex: 'ez_curl', sets: 3, lo: 8, hi: 12, rest: 60 },
    { ex: 'db_hammer', sets: 2, lo: 10, hi: 12, rest: 60 },
  ]},
  legs: { name: 'Legs', focus: 'Quads · Hamstrings · Glutes · Calves', items: [
    { ex: 'bb_squat', sets: 3, lo: 5, hi: 8, rest: 180 },
    { ex: 'bb_rdl', sets: 3, lo: 8, hi: 10, rest: 150 },
    { ex: 'leg_press', sets: 3, lo: 10, hi: 12, rest: 120 },
    { ex: 'm_seated_curl', sets: 3, lo: 10, hi: 12, rest: 90 },
    { ex: 'm_leg_ext', sets: 3, lo: 12, hi: 15, rest: 60 },
    { ex: 'm_standing_calf', sets: 4, lo: 10, hi: 15, rest: 60 },
  ]},
  upper: { name: 'Upper', focus: 'Chest · Back · Shoulders · Arms', items: [
    { ex: 'pl_incline_press', sets: 3, lo: 6, hi: 10, rest: 150 },
    { ex: 'pl_iso_row', sets: 3, lo: 6, hi: 10, rest: 150 },
    { ex: 'm_chest_press', sets: 2, lo: 10, hi: 12, rest: 90 },
    { ex: 'm_assist_pullup', sets: 3, lo: 8, hi: 12, rest: 90 },
    { ex: 'm_lateral', sets: 3, lo: 12, hi: 15, rest: 60 },
    { ex: 'db_incline_curl', sets: 2, lo: 10, hi: 12, rest: 60 },
    { ex: 'ez_skull', sets: 2, lo: 10, hi: 12, rest: 60 },
  ]},
  lower: { name: 'Lower', focus: 'Glutes · Hamstrings · Quads · Abs', items: [
    { ex: 'hack_squat', sets: 3, lo: 6, hi: 10, rest: 150 },
    { ex: 'bb_hip_thrust', sets: 3, lo: 8, hi: 12, rest: 120 },
    { ex: 'db_bulgarian', sets: 2, lo: 8, hi: 12, rest: 90 },
    { ex: 'm_lying_curl', sets: 3, lo: 10, hi: 12, rest: 90 },
    { ex: 'pl_seated_calf', sets: 3, lo: 12, hi: 15, rest: 60 },
    { ex: 'c_crunch', sets: 3, lo: 10, hi: 15, rest: 60 },
  ]},
};

const CYCLE_PRESETS = {
  'P-P-L-R-U-L-R (7-day week)': ['push', 'pull', 'legs', 'rest', 'upper', 'lower', 'rest'],
  'P-P-L-U-L-R (6 on, 1 off)': ['push', 'pull', 'legs', 'upper', 'lower', 'rest'],
  'U-L-R-P-P-L-R': ['upper', 'lower', 'rest', 'push', 'pull', 'legs', 'rest'],
  'P-P-L-R-U-L (rolling)': ['push', 'pull', 'legs', 'rest', 'upper', 'lower'],
};

const COACH_TIPS = [
  'Double progression: once you hit the top of the rep range on every set, add weight and start again at the bottom.',
  'Most working sets should end with 1-3 reps left in the tank (RIR 1-3). Take isolation work closer to failure.',
  'Warm up big lifts with 2-3 ramp-up sets (e.g. 50% × 8, 70% × 5, 85% × 2) before working sets.',
  'Rest 2-3 min on heavy compounds and 60-90 s on isolation work. Short rest on big lifts costs reps.',
  'Aim for about 0.7-1 g of protein per lb of bodyweight daily, spread over 3-5 meals.',
  'Sleep is the cheapest performance enhancer: 7-9 hours.',
  'Stalled 2+ sessions in a row? Check sleep and food first, then consider a deload or an exercise swap.',
  'Every 6-8 weeks, take a deload week: same exercises, about half the sets, lighter weights.',
  'Control the negative (2-3 s). The lowering phase builds plenty of muscle.',
  'Same machine, same seat setting: write your seat and pin positions in the workout notes.',
  'Machines let you push close to failure safely. Use them for your last sets on a muscle.',
  'The ARC is busiest in the late afternoon and evening. Go mid-morning or later at night for open racks.',
  'Your log is your coach: try to beat last time by a rep or 5 lb on at least one set.',
  'Re-rack your weights and wipe down your station.',
];

const GUIDE = [
  { t: 'How your PPL × UL split works', b: `
    <p>You train each muscle about <b>twice a week</b>: once on the PPL day and once on the Upper/Lower day.</p>
    <ul>
      <li><b>Push</b>: chest, shoulders, triceps</li>
      <li><b>Pull</b>: back, rear delts, biceps</li>
      <li><b>Legs</b>: quads, hamstrings, glutes, calves</li>
      <li><b>Upper</b>: chest, back, shoulders, arms (heavier, lower reps)</li>
      <li><b>Lower</b>: posterior chain and quads, plus abs</li>
    </ul>
    <p>The app follows your rotation. If you miss a day, it picks up where you left off instead of skipping ahead.</p>` },
  { t: 'Progressive overload (the #1 rule)', b: `
    <p>To keep growing, you have to do a little more over time. The app uses <b>double progression</b>:</p>
    <ol>
      <li>Each exercise has a rep range, like 8-12.</li>
      <li>Keep the same weight until you hit <b>12 on every set</b>.</li>
      <li>Then add the smallest jump (5 lb dumbbells/barbell, 10 lb machines) and start back at 8.</li>
    </ol>
    <p>The <b>🎯 Target</b> line on each exercise does this math for you from your last session.</p>` },
  { t: 'How hard should sets be? (RIR)', b: `
    <p><b>RIR = Reps In Reserve</b>: how many more clean reps you could have done.</p>
    <ul>
      <li>Heavy compounds (squat, bench, deadlift): <b>RIR 1-3</b></li>
      <li>Machines and isolation: <b>RIR 0-2</b>. Going to failure is fine here.</li>
    </ul>
    <p>If every set feels easy, you're leaving gains on the table. If form breaks down, stop the set.</p>` },
  { t: 'Warm-ups', b: `
    <ul>
      <li>5 min of light cardio or dynamic movement to get warm</li>
      <li>First compound of the day: ramp up, e.g. empty bar × 10, 50% × 8, 70% × 5, 85% × 2</li>
      <li>Later exercises: 1 light feeder set is usually enough</li>
      <li>Don't log warm-up sets. Log working sets only.</li>
    </ul>` },
  { t: 'Rest times', b: `
    <ul>
      <li>Heavy compounds: <b>2-3 min</b></li>
      <li>Machine compounds: <b>90-120 s</b></li>
      <li>Isolation: <b>60-90 s</b></li>
    </ul>
    <p>The rest timer starts on its own when you check off a set.</p>` },
  { t: 'Weekly volume', b: `
    <p>Most lifters grow well on <b>10-20 hard sets per muscle per week</b>. The Progress tab counts your sets per muscle for the last 7 days (secondary muscles count as ½).</p>
    <p>Under 10: add a set or two. Way over 20 and not recovering: trim.</p>` },
  { t: 'Deloads & plateaus', b: `
    <ul>
      <li>Every <b>6-8 weeks</b> or when you feel beat up: one week at ~half the sets, lighter loads</li>
      <li>Stalled on a lift for 3 sessions? Drop the weight 10% and build back, or swap to a similar machine</li>
      <li>Check the basics first: sleep, protein, total calories</li>
    </ul>` },
  { t: 'Nutrition basics', b: `
    <ul>
      <li><b>Protein</b>: 0.7-1 g per lb bodyweight per day</li>
      <li><b>Building muscle</b>: a small calorie surplus (~250-500 kcal/day)</li>
      <li><b>Cutting</b>: a moderate deficit (~300-500 kcal/day). Keep lifting heavy to hold onto muscle.</li>
      <li>Water and creatine monohydrate (3-5 g/day) are the best-studied basics</li>
    </ul>` },
  { t: 'ARC etiquette & tips', b: `
    <ul>
      <li>Bring your student ID / membership card and a towel</li>
      <li>Re-rack plates and dumbbells, wipe down benches and machines</li>
      <li>Let people work in between sets on machines when it's busy</li>
      <li>Check current hours on the <a href="https://campusrecreation.ucdavis.edu/" target="_blank" rel="noopener">Campus Rec site</a></li>
      <li>Hit the Machines tab and hide anything the ARC doesn't have, or add machines it does</li>
    </ul>` },
];
