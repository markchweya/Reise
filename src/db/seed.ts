import type { SQLiteDatabase } from 'expo-sqlite';

const SAMPLE_ID = 'note_sample_photosynthesis';

const SAMPLE_TEXT = `Biology — Week 4: Photosynthesis

Overview
Photosynthesis is how plants, algae and some bacteria convert light energy into chemical energy stored as glucose. Overall equation:

6 CO2 + 6 H2O + light energy -> C6H12O6 + 6 O2

It happens in the chloroplast, which has two relevant compartments: the thylakoid membrane and the stroma.

The light-dependent reactions
These run in the thylakoid membrane and need light directly.
Chlorophyll a absorbs light most strongly at 430 nm (blue) and 662 nm (red), reflecting green, which is why leaves look green.
Photosystem II comes first despite the name. It splits water — photolysis — releasing O2 as a by-product, plus electrons and protons.
Electrons pass down the electron transport chain, pumping protons into the thylakoid space and building a gradient.
ATP synthase lets protons back through, making ATP. This is photophosphorylation.
Photosystem I re-energises the electrons and reduces NADP+ to NADPH.
Net products: ATP, NADPH, O2.

The light-independent reactions (Calvin cycle)
These run in the stroma. They do not need light directly but they do need the ATP and NADPH the light reactions made, so they stop in prolonged darkness.
1. Carbon fixation. RuBisCO attaches CO2 to RuBP (5C), making an unstable 6C compound that immediately splits into two molecules of GP (3C).
2. Reduction. ATP and NADPH convert GP into TP (triose phosphate).
3. Regeneration. Five out of every six TP molecules regenerate RuBP, using more ATP. The sixth leaves the cycle.
Three turns of the cycle fix three CO2 and yield one net TP. Six turns give one glucose.

Limiting factors
Light intensity, CO2 concentration and temperature can each limit the rate. The rate plateaus when something else becomes limiting. Above roughly 40 C the rate falls because RuBisCO denatures.

Exam note: markers want the compartment named. "In the chloroplast" is not enough — say thylakoid membrane or stroma.
Unclear from lecture: whether photorespiration is examinable. Check the spec.`;

/** One real note on first launch, so the app has something to show and the
 *  chat has something to retrieve before the student imports anything. */
export async function seedSampleNote(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM notes LIMIT 1');
  if (existing) return;
  await db.runAsync(
    `INSERT INTO notes (id, title, source_type, original_uri, created_at, byte_size, status, error_message, text)
     VALUES (?, ?, 'sample', NULL, ?, ?, 'pending', NULL, ?)`,
    SAMPLE_ID,
    'Biology — Week 4: Photosynthesis',
    Date.now(),
    SAMPLE_TEXT.length,
    SAMPLE_TEXT,
  );
}
