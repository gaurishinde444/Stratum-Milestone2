/**
 * Skill-assessment questions: three per skill, one per difficulty (1 = easy, 2 = medium, 3 = hard).
 * Answers ship to the browser, which is fine for a self-check. For graded use, the backend
 * should serve questions without `answer` and score submissions server-side.
 */
import type { Proficiency } from '../types/models'

export interface QuizQuestion {
  id: string
  skill: string
  difficulty: Proficiency
  prompt: string
  code?: string
  options: string[]
  answer: number
  explanation: string
}

export const QUESTION_BANK: QuizQuestion[] = [
  // Python
  { id: 'py-1', skill: 'Python', difficulty: 1, prompt: 'What does this print?', code: 'print(len([1, [2, 3], 4]))', options: ['3', '4', '2', 'An error'], answer: 0, explanation: 'The inner list [2, 3] counts as a single element, so the outer list has 3 items.' },
  { id: 'py-2', skill: 'Python', difficulty: 2, prompt: 'What does this list comprehension produce?', code: '[x * 2 for x in range(4) if x % 2 == 0]', options: ['[0, 2, 4, 6]', '[0, 4]', '[2, 6]', '[0, 4, 8]'], answer: 1, explanation: 'range(4) gives 0–3; the even values 0 and 2 are kept and doubled, giving [0, 4].' },
  { id: 'py-3', skill: 'Python', difficulty: 3, prompt: 'What does the last line print?', code: 'def add(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\nadd(1)\nprint(add(2))', options: ['[2]', '[1, 2]', 'An error', '[[1], 2]'], answer: 1, explanation: 'Default arguments are evaluated once, so every call shares the same list. Use bucket=None and create the list inside.' },

  // Java
  { id: 'java-1', skill: 'Java', difficulty: 1, prompt: 'Which keyword makes one class inherit from another?', options: ['implements', 'extends', 'inherits', 'super'], answer: 1, explanation: '`extends` creates a subclass; `implements` is for interfaces.' },
  { id: 'java-2', skill: 'Java', difficulty: 2, prompt: 'What does this print?', code: 'String a = new String("hi");\nString b = new String("hi");\nSystem.out.println(a == b);', options: ['true', 'false', 'Compile error', 'hi'], answer: 1, explanation: '`==` compares object references. Two `new String` calls create different objects; use a.equals(b) to compare text.' },
  { id: 'java-3', skill: 'Java', difficulty: 3, prompt: 'What happens when this runs?', code: 'int[] arr = new int[3];\nSystem.out.println(arr[3]);', options: ['Prints 0', 'Prints null', 'Compile error', 'Throws ArrayIndexOutOfBoundsException'], answer: 3, explanation: 'Valid indexes are 0–2. The code compiles, but accessing index 3 fails at runtime.' },

  // C / C++
  { id: 'c-1', skill: 'C / C++', difficulty: 1, prompt: 'Which header do you include to use printf in C?', options: ['<stdlib.h>', '<stdio.h>', '<string.h>', '<iostream>'], answer: 1, explanation: 'printf is declared in <stdio.h> (standard input/output).' },
  { id: 'c-2', skill: 'C / C++', difficulty: 2, prompt: 'What does this print?', code: 'int x = 5;\nint *p = &x;\n*p = 10;\nprintf("%d", x);', options: ['5', '10', 'The address of x', 'Compile error'], answer: 1, explanation: 'p points to x, so writing through *p changes x itself.' },
  { id: 'c-3', skill: 'C / C++', difficulty: 3, prompt: 'What is the value of n?', code: 'int a[5];\nsize_t n = sizeof(a) / sizeof(a[0]);', options: ['5', '20', '4', 'It depends on the compiler'], answer: 0, explanation: 'Total array size divided by one element\'s size is always the element count, whatever sizeof(int) is.' },

  // JavaScript
  { id: 'js-1', skill: 'JavaScript', difficulty: 1, prompt: 'What does typeof [] return?', options: ['"array"', '"object"', '"list"', '"undefined"'], answer: 1, explanation: 'Arrays are objects in JavaScript. Use Array.isArray() to check for arrays.' },
  { id: 'js-2', skill: 'JavaScript', difficulty: 2, prompt: 'What does this print?', code: 'console.log(0.1 + 0.2 === 0.3)', options: ['true', 'false', 'TypeError', 'undefined'], answer: 1, explanation: 'Floating-point rounding makes 0.1 + 0.2 equal 0.30000000000000004.' },
  { id: 'js-3', skill: 'JavaScript', difficulty: 3, prompt: 'What gets logged?', code: 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0)\n}', options: ['0 1 2', '3 3 3', '0 0 0', 'undefined three times'], answer: 1, explanation: '`var` is function-scoped, so all callbacks share one i, which is 3 by the time they run. `let` would log 0 1 2.' },

  // React
  { id: 'react-1', skill: 'React', difficulty: 1, prompt: 'What does useState return?', options: ['Only the current value', 'An array: [value, setter function]', 'An object { value, set }', 'A promise'], answer: 1, explanation: 'useState returns a pair, usually destructured as const [value, setValue] = useState(initial).' },
  { id: 'react-2', skill: 'React', difficulty: 2, prompt: 'Why do items rendered from a list need a key prop?', options: ['To apply CSS styles', 'HTML requires it', 'So React can match items between renders and update them correctly', 'For search engine optimisation'], answer: 2, explanation: 'Stable keys let React tell which items were added, removed or reordered.' },
  { id: 'react-3', skill: 'React', difficulty: 3, prompt: 'When does useEffect(() => { … }, []) run?', options: ['Before every render', 'After every render', 'Once, after the first render (cleanup on unmount)', 'Never — the empty array disables it'], answer: 2, explanation: 'An empty dependency array means no values can change, so the effect runs only after mounting.' },

  // HTML / CSS
  { id: 'html-1', skill: 'HTML / CSS', difficulty: 1, prompt: 'Which tag is for the main heading of a page?', options: ['<head>', '<h1>', '<header>', '<h6>'], answer: 1, explanation: '<h1> is the top-level heading. <head> holds metadata and <header> is a page section.' },
  { id: 'html-2', skill: 'HTML / CSS', difficulty: 2, prompt: 'Which selector has the highest specificity?', options: ['.menu .item', '#menu', 'div p a', 'a:hover'], answer: 1, explanation: 'An ID selector outranks any number of class or element selectors.' },
  { id: 'html-3', skill: 'HTML / CSS', difficulty: 3, prompt: 'In a flex container with flex-direction: column, which property centres items horizontally?', options: ['justify-content', 'flex-wrap', 'align-items', 'text-align'], answer: 2, explanation: 'With a column direction the cross axis is horizontal, and align-items controls the cross axis.' },

  // Node.js
  { id: 'node-1', skill: 'Node.js', difficulty: 1, prompt: 'Which command installs the dependencies listed in package.json?', options: ['npm install', 'node install', 'npm start', 'npm build'], answer: 0, explanation: 'npm install reads package.json and downloads everything into node_modules.' },
  { id: 'node-2', skill: 'Node.js', difficulty: 2, prompt: 'In what order are the letters printed?', code: "console.log('A')\nsetTimeout(() => console.log('B'), 0)\nPromise.resolve().then(() => console.log('C'))\nconsole.log('D')", options: ['A B C D', 'A D B C', 'A D C B', 'A C D B'], answer: 2, explanation: 'Synchronous code runs first (A, D), then microtasks like promises (C), then timers (B).' },
  { id: 'node-3', skill: 'Node.js', difficulty: 3, prompt: 'In Express middleware, what does calling next() do?', options: ['Sends the response to the client', 'Restarts the request', 'Ends the Node process', 'Passes control to the next middleware or route handler'], answer: 3, explanation: 'Without next() (or sending a response) the request just hangs.' },

  // SQL
  { id: 'sql-1', skill: 'SQL', difficulty: 1, prompt: 'Which clause filters rows in a SELECT query?', options: ['WHERE', 'ORDER BY', 'GROUP BY', 'LIMIT'], answer: 0, explanation: 'WHERE keeps only rows that match a condition.' },
  { id: 'sql-2', skill: 'SQL', difficulty: 2, prompt: 'How is HAVING different from WHERE?', options: ['They are interchangeable', 'HAVING is faster', 'HAVING filters groups after GROUP BY; WHERE filters rows before grouping', 'WHERE only works with numbers'], answer: 2, explanation: 'Use HAVING for conditions on aggregates, e.g. HAVING COUNT(*) > 5.' },
  { id: 'sql-3', skill: 'SQL', difficulty: 3, prompt: 'students has 5 rows. marks has one row each for 3 of those students. What does this return?', code: 'SELECT COUNT(*)\nFROM students s\nLEFT JOIN marks m ON s.id = m.student_id;', options: ['3', '5', '8', '15'], answer: 1, explanation: 'A LEFT JOIN keeps every student; the 2 without marks appear once with NULLs, giving 5 rows.' },

  // Machine Learning
  { id: 'ml-1', skill: 'Machine Learning', difficulty: 1, prompt: 'Training a model on examples that already have correct labels is called…', options: ['Unsupervised learning', 'Reinforcement learning', 'Supervised learning', 'Clustering'], answer: 2, explanation: 'Supervised learning learns a mapping from inputs to known labels.' },
  { id: 'ml-2', skill: 'Machine Learning', difficulty: 2, prompt: 'A model scores 99% on training data but 60% on test data. What is most likely happening?', options: ['Underfitting', 'Overfitting', 'The test set is too large', 'The model is ready to deploy'], answer: 1, explanation: 'A big train/test gap means the model memorised the training data. Try regularisation, more data or a simpler model.' },
  { id: 'ml-3', skill: 'Machine Learning', difficulty: 3, prompt: 'A disease affects 1% of patients. A model that always predicts "healthy" is 99% accurate. Which metric exposes the problem?', options: ['Overall accuracy', 'Training loss', 'R² score', 'Recall on the disease class'], answer: 3, explanation: 'Recall on the positive class is 0% — the model never finds a sick patient. Imbalanced data needs class-aware metrics.' },

  // Data analysis
  { id: 'data-1', skill: 'Data analysis', difficulty: 1, prompt: 'What is the mean of 2, 4, 4 and 10?', options: ['4', '5', '10', '20'], answer: 1, explanation: '(2 + 4 + 4 + 10) / 4 = 5. The median would be 4.' },
  { id: 'data-2', skill: 'Data analysis', difficulty: 2, prompt: 'A salary dataset has a few extremely high values. Which statistic best represents a typical salary?', options: ['Mean', 'Maximum', 'Median', 'Range'], answer: 2, explanation: 'The median is resistant to outliers; the mean gets pulled upwards.' },
  { id: 'data-3', skill: 'Data analysis', difficulty: 3, prompt: 'What does this pandas code return?', code: "df.groupby('dept')['salary'].mean()", options: ['The average salary for each department', 'The overall average salary', 'The number of rows per department', 'Salaries sorted by department'], answer: 0, explanation: 'groupby splits rows by department, then mean() aggregates salary within each group.' },

  // UI / UX
  { id: 'ux-1', skill: 'UI / UX', difficulty: 1, prompt: 'What is the minimum WCAG AA contrast ratio for normal body text?', options: ['2:1', '3:1', '4.5:1', '7:1'], answer: 2, explanation: '4.5:1 for normal text; 3:1 is allowed for large text. 7:1 is the stricter AAA level.' },
  { id: 'ux-2', skill: 'UI / UX', difficulty: 2, prompt: 'What is the main purpose of usability testing?', options: ['Watching real users attempt tasks to find where they struggle', 'Checking that the code has no bugs', 'Measuring page load speed', 'Asking users which colours they like'], answer: 0, explanation: 'Observing behaviour reveals problems that opinions and code reviews miss.' },
  { id: 'ux-3', skill: 'UI / UX', difficulty: 3, prompt: "What does Fitts's law describe?", options: ['Users scan pages in an F-shaped pattern', 'Time to hit a target depends on its size and distance', 'Decision time grows with the number of choices', 'People remember about 7 items at once'], answer: 1, explanation: 'Bigger, closer targets are faster to hit — why primary buttons should be large. Decision time vs choices is Hick\'s law.' },

  // Git
  { id: 'git-1', skill: 'Git', difficulty: 1, prompt: 'Which command saves your staged changes as a new snapshot?', options: ['git push', 'git add', 'git commit', 'git stash'], answer: 2, explanation: 'git add stages changes, git commit records them, git push uploads commits.' },
  { id: 'git-2', skill: 'Git', difficulty: 2, prompt: 'What does git pull do?', options: ['Uploads your commits to the remote', 'Fetches remote changes and merges them into your branch', 'Creates a new branch', 'Discards your local changes'], answer: 1, explanation: 'git pull is git fetch followed by git merge (or rebase, if configured).' },
  { id: 'git-3', skill: 'Git', difficulty: 3, prompt: "You committed by mistake and haven't pushed. How do you undo the commit but keep your changes?", options: ['git reset --soft HEAD~1', 'git reset --hard HEAD~1', 'git revert HEAD', 'git clean -fd'], answer: 0, explanation: '--soft moves the branch back one commit and keeps changes staged. --hard would delete them.' },

  // Arduino / IoT
  { id: 'iot-1', skill: 'Arduino / IoT', difficulty: 1, prompt: 'In an Arduino sketch, which function runs over and over?', options: ['setup()', 'loop()', 'main()', 'repeat()'], answer: 1, explanation: 'setup() runs once at power-on; loop() then repeats forever.' },
  { id: 'iot-2', skill: 'Arduino / IoT', difficulty: 2, prompt: 'A push-button wired with no resistor gives random readings. What is the simplest fix?', options: ['Use analogRead() instead', 'Add delay(1000)', 'Call Serial.begin()', 'Use pinMode(pin, INPUT_PULLUP)'], answer: 3, explanation: 'An unconnected input "floats". The internal pull-up resistor holds it HIGH until the button pulls it LOW.' },
  { id: 'iot-3', skill: 'Arduino / IoT', difficulty: 3, prompt: 'Why is MQTT widely used in IoT projects?', options: ['It is the only protocol ESP32 supports', 'It encrypts data automatically', 'It is a lightweight publish/subscribe protocol suited to low-power, unreliable networks', 'It replaces Wi-Fi'], answer: 2, explanation: 'Small packets and a broker-based pub/sub model suit constrained devices. Encryption needs TLS on top.' },
]

/** How many skills a single quiz covers, so it stays around five minutes. */
export const MAX_QUIZ_SKILLS = 5

/** Questions for the given skills, easiest first within each skill, with answer options shuffled. */
export function buildQuiz(skills: string[]): QuizQuestion[] {
  return skills.slice(0, MAX_QUIZ_SKILLS).flatMap(skill => QUESTION_BANK.filter(q => q.skill === skill).sort((a, b) => a.difficulty - b.difficulty).map(shuffleOptions))
}

function shuffleOptions(question: QuizQuestion): QuizQuestion {
  const order = question.options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]]
  }
  return { ...question, options: order.map(i => question.options[i]), answer: order.indexOf(question.answer) }
}
