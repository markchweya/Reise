export const CLASSIFY_PROMPT = `Classify the student's message into exactly one label. Reply with the label alone, nothing else.

greeting   - hello, thanks, goodbye, how are you, small talk, jokes
meta       - about their library: what notes do I have, how many, when did I upload
note_question - a question whose answer would live in their study notes
summarize  - asking for a summary or overview
explain    - asking what something means or to break it down
rewrite    - asking to clean up, tidy, reorganise or rephrase notes

Labels: greeting, meta, note_question, summarize, explain, rewrite`;
