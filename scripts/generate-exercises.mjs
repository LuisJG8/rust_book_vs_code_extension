#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(repoRoot, 'assets');

const chapters = [
  {
    title: 'Getting Started',
    exercises: [
      task('Hello output', 'Print "Hello, Rust!" and your name from `main`.', 'The program prints both lines.'),
      task('println! macro', 'Print three labeled lines with `println!`.', 'Each line has a clear label.'),
      task('main function', 'Move repeated printing into a helper called from `main`.', '`main` calls one helper function.'),
      task('semicolons', 'Fix a missing semicolon compile error.', 'The fixed program compiles.'),
      task('rustc compile', 'Write a `main.rs` that compiles with `rustc main.rs`.', '`rustc` builds the file successfully.'),
      task('Cargo run', 'Add a helper function and run it with `cargo run`.', '`cargo run` prints the helper result.'),
      task('Package name', 'Print the Cargo package name with `env!`.', 'The output includes the package name.'),
      task('cargo check', 'Fix the starter code until `cargo check` passes.', '`cargo check` finishes without errors.'),
      task('rustfmt', 'Format a messy function with `cargo fmt`.', 'The code is formatted and still runs.'),
      task('Build steps', 'Print one line for compile and one line for run.', 'The output shows both steps.')
    ]
  },
  {
    title: 'Programming a Guessing Game',
    exercises: [
      task('Standard input', 'Read one line from stdin and print it back.', 'The typed text is echoed.'),
      task('Mutable variable', 'Store user input in a mutable `String`.', 'The input buffer is filled and printed.'),
      task('Parsing numbers', 'Parse a trimmed input string into a number.', 'Valid numbers parse successfully.'),
      task('Result handling', 'Print a friendly message for bad number input.', 'Invalid input does not panic.'),
      task('Random number', 'Generate a number from 1 to 100.', 'The number stays in range.'),
      task('Ordering match', 'Match a guess against a secret number.', 'Less, equal, and greater are handled.'),
      task('Loop and break', 'Keep asking until the guess is correct.', 'The loop stops on the right guess.'),
      task('Shadowing', 'Shadow a string guess with its parsed number.', 'Both bindings are used correctly.'),
      task('Dependency setup', 'Add `rand` and use it in `main`.', 'The program builds with the dependency.'),
      task('User feedback', 'Print a hint after each wrong guess.', 'Wrong guesses show useful hints.')
    ]
  },
  {
    title: 'Common Programming Concepts',
    exercises: [
      task('Immutability', 'Try to change an immutable value, then fix it.', 'The final code explains the fix.'),
      task('Mutable variables', 'Update a mutable score three times.', 'The final score is correct.'),
      task('Shadowing', 'Convert a string length into a number using shadowing.', 'Each shadowed value has the right type.'),
      task('Scalar types', 'Create examples of integer, float, bool, and char.', 'All four values are printed.'),
      task('Tuples', 'Return a tuple and destructure it.', 'Each tuple field is used.'),
      task('Arrays', 'Read the first and last item of an array.', 'Both values print correctly.'),
      task('Functions', 'Write a function that takes two numbers and returns one.', 'The function result is printed.'),
      task('Expressions', 'Use an `if` expression to choose a value.', 'Both branches return the same type.'),
      task('Loops', 'Use a loop to count down from five.', 'The loop stops at zero.'),
      task('Comments', 'Add one useful comment to a tricky calculation.', 'The comment explains the calculation.')
    ]
  },
  {
    title: 'Understanding Ownership',
    exercises: [
      task('Move semantics', 'Move a `String` into a function.', 'The moved value is not reused.'),
      task('Clone behavior', 'Clone a `String` before using it twice.', 'Both strings print successfully.'),
      task('Borrowing', 'Borrow a `String` to calculate its length.', 'The caller keeps ownership.'),
      task('Mutable references', 'Change a string through one mutable reference.', 'The original string is updated.'),
      task('Reference rules', 'Fix code with overlapping mutable borrows.', 'The fixed code compiles.'),
      task('Slices', 'Return the first word as a string slice.', 'The returned slice is correct.'),
      task('Ownership return', 'Return ownership from a helper function.', 'The caller receives the value.'),
      task('Dangling prevention', 'Fix a function that would return a dangling reference.', 'The function returns valid data.'),
      task('String storage', 'Compare a string literal and a `String`.', 'The code shows both forms.'),
      task('Borrow scopes', 'Shorten a borrow scope so mutation can happen later.', 'Borrowing and mutation both compile.')
    ]
  },
  {
    title: 'Using Structs to Structure Related Data',
    exercises: [
      task('Struct fields', 'Define a `Book` struct and create one value.', 'The fields are read and printed.'),
      task('Field init shorthand', 'Build a struct using field init shorthand.', 'The shorthand fields are correct.'),
      task('Struct update syntax', 'Create a second value with struct update syntax.', 'Only the changed fields differ.'),
      task('Tuple structs', 'Create `Color` and `Point` tuple structs.', 'Both tuple structs are used.'),
      task('Debug output', 'Derive `Debug` and print a struct with `dbg!`.', 'The debug output is visible.'),
      task('Area function', 'Replace separate width and height with a `Rectangle`.', 'Area is calculated from the struct.'),
      task('Methods', 'Add an `area` method to `Rectangle`.', 'Calling the method returns the area.'),
      task('Borrowed self', 'Write a method that reads `self` without moving it.', 'The value can be used after the call.'),
      task('Mutable self', 'Write a method that changes one field.', 'The struct updates in place.'),
      task('Associated function', 'Add a `square` constructor.', '`Rectangle::square` creates equal sides.')
    ]
  },
  {
    title: 'Enums and Pattern Matching',
    exercises: [
      task('Enum variants', 'Define a `TrafficLight` enum and match each color.', 'Every color has an action.'),
      task('Data variants', 'Store data inside an enum variant.', 'The stored data is printed.'),
      task('Option', 'Return `Some` for a found item and `None` otherwise.', 'Both cases are handled.'),
      task('Match exhaustiveness', 'Add the missing match arm.', 'The match covers every variant.'),
      task('Pattern binding', 'Bind a value inside a match arm.', 'The bound value is used.'),
      task('if let', 'Use `if let` for one `Option` case.', 'Only the `Some` case prints.'),
      task('let else', 'Use `let else` to exit on `None`.', 'The early exit is clear.'),
      task('Fallback arm', 'Handle all other values with `_`.', 'Unhandled values use the fallback.'),
      task('Nested enums', 'Match an enum that contains another enum.', 'The nested case is handled.'),
      task('Domain model', 'Model a small order status with an enum.', 'Each status has distinct behavior.')
    ]
  },
  {
    title: 'Packages, Crates, and Modules',
    exercises: [
      task('Module basics', 'Create a module with one public function.', 'The function is called from `main`.'),
      task('Library crate', 'Move a helper into `src/lib.rs`.', '`main.rs` calls the library helper.'),
      task('Module tree', 'Build a two-level restaurant module tree.', 'A nested function is reachable.'),
      task('Privacy', 'Hide a helper behind a public wrapper.', 'Only the wrapper is public.'),
      task('Paths', 'Call one item with an absolute path and one with a relative path.', 'Both paths compile.'),
      task('use imports', 'Shorten a long path with `use`.', 'The shorter name is used.'),
      task('Renamed imports', 'Use `as` to avoid an import name conflict.', 'Both imported names are distinct.'),
      task('Re-exports', 'Expose a nested type with `pub use`.', 'Callers use the re-exported path.'),
      task('Separate files', 'Move one module into its own file.', 'The module still compiles.'),
      task('Public API', 'Expose two public functions and keep helpers private.', 'The public API stays small.')
    ]
  },
  {
    title: 'Common Collections',
    exercises: [
      task('Vectors', 'Push three numbers into a `Vec` and print them.', 'All numbers are stored.'),
      task('Vector access', 'Use `get` to read a vector item safely.', 'Missing indexes return `None`.'),
      task('Mutable iteration', 'Add one to every number in a vector.', 'The vector values change.'),
      task('String building', 'Build a `String` with `push_str` and `push`.', 'The final string is correct.'),
      task('format!', 'Combine strings without taking ownership.', 'The original strings remain usable.'),
      task('UTF-8 chars', 'Print the characters in a UTF-8 string.', 'Multibyte characters stay intact.'),
      task('Hash maps', 'Insert and read scores in a `HashMap`.', 'A known key returns its score.'),
      task('Entry API', 'Count words with `entry` and `or_insert`.', 'Repeated words increment counts.'),
      task('Ownership in maps', 'Move owned strings into a `HashMap`.', 'Moved keys are not reused.'),
      task('Collection choice', 'Use a vector for order and a map for lookup.', 'Each collection has a clear job.')
    ]
  },
  {
    title: 'Error Handling',
    exercises: [
      task('panic!', 'Write a function that panics on an invalid index.', 'The panic happens only for bad input.'),
      task('Result', 'Return `Result<i32, String>` from a parser.', 'Good and bad input are represented.'),
      task('Matching errors', 'Handle `Ok` and `Err` with `match`.', 'Both branches print useful output.'),
      task('Propagation', 'Propagate a parse error from a helper.', 'The caller handles the error.'),
      task('? operator', 'Replace nested matches with `?`.', 'The behavior stays the same.'),
      task('Custom error', 'Create a small custom error enum.', 'Each error kind has its own variant.'),
      task('expect message', 'Use `expect` with a specific message.', 'The message explains the assumption.'),
      task('Input validation', 'Reject an empty username with `Result`.', 'Empty input returns an error.'),
      task('Error boundary', 'Handle errors in `main` and keep helpers clean.', '`main` prints the final error.'),
      task('API choice', 'Choose `panic!` or `Result` for two tiny functions.', 'The choice matches the failure kind.')
    ]
  },
  {
    title: 'Generic Types, Traits, and Lifetimes',
    exercises: [
      task('Generic function', 'Write `largest` for any ordered slice.', 'It works for numbers and chars.'),
      task('Generic struct', 'Create `Point<T>` and read its fields.', 'Two point types compile.'),
      task('Mixed generics', 'Create `Point<T, U>` with different field types.', 'The fields can have different types.'),
      task('Trait definition', 'Define a `Summary` trait and implement it.', 'Calling `summarize` works.'),
      task('Trait bounds', 'Write a function that accepts `Summary` items.', 'Only summarizable values compile.'),
      task('impl Trait', 'Return a value with `impl Summary`.', 'The caller can call trait methods.'),
      task('where clause', 'Move complex bounds into a `where` clause.', 'The signature stays readable.'),
      task('Lifetimes', 'Return the longer of two string slices.', 'The returned slice is valid.'),
      task('Lifetime elision', 'Write a method that relies on elision rules.', 'The method compiles without named lifetimes.'),
      task('Borrowed return', 'Return a reference stored inside a struct.', 'The reference cannot outlive the struct.')
    ]
  },
  {
    title: 'Writing Automated Tests',
    exercises: [
      task('Unit test', 'Add a unit test for an `add_two` function.', 'The test passes.'),
      task('assert_eq!', 'Use `assert_eq!` for an exact result.', 'The expected value is checked.'),
      task('Custom message', 'Add a custom failure message to `assert!`.', 'The message includes the bad value.'),
      task('should_panic', 'Test that invalid input panics.', 'The panic test passes.'),
      task('Result test', 'Write a test that returns `Result<(), String>`.', 'The test uses `?` for setup.'),
      task('Test filters', 'Name tests so one can be run by keyword.', 'A filtered test run selects one test.'),
      task('Ignored test', 'Mark a slow test with `#[ignore]`.', 'Normal test runs skip it.'),
      task('Integration test', 'Add an integration test in `tests/`.', 'The test uses the public API.'),
      task('Private helper', 'Test a private helper inside its module.', 'The helper test passes.'),
      task('Test organization', 'Group related tests in a test module.', 'The module keeps tests readable.')
    ]
  },
  {
    title: 'An I/O Project: Building a Command Line Program',
    exercises: [
      task('Arguments', 'Read a query and file path from `env::args`.', 'Both arguments are captured.'),
      task('File reading', 'Read a file into a string.', 'The file contents are printed.'),
      task('Config struct', 'Build a `Config` from command arguments.', 'Missing arguments return an error.'),
      task('Error handling', 'Return `Result` from the CLI setup code.', 'Setup failures are handled.'),
      task('Library split', 'Move search logic into `lib.rs`.', '`main.rs` stays small.'),
      task('TDD search', 'Write a failing search test, then make it pass.', 'The search test passes.'),
      task('Case sensitivity', 'Use an env var to switch search mode.', 'The mode changes with the env var.'),
      task('stderr', 'Print errors with `eprintln!`.', 'Errors go to standard error.'),
      task('Iterators', 'Rewrite search with iterator adapters.', 'Search results stay the same.'),
      task('Separation', 'Keep parsing, searching, and printing in separate functions.', 'Each function has one job.')
    ]
  },
  {
    title: 'Functional Language Features: Iterators and Closures',
    exercises: [
      task('Closure basics', 'Store a closure and call it twice.', 'Both calls return expected values.'),
      task('Closure capture', 'Capture a variable from the surrounding scope.', 'The closure uses the captured value.'),
      task('Fn traits', 'Pass a closure into a function.', 'The function calls the closure.'),
      task('Iterator next', 'Call `next` manually on an iterator.', 'The sequence advances correctly.'),
      task('Map and collect', 'Use `map` and `collect` to transform a vector.', 'The new vector has transformed values.'),
      task('Lazy adapters', 'Show that `map` is lazy until consumed.', 'Work happens only after consumption.'),
      task('Consuming adapters', 'Use `sum` to consume an iterator.', 'The total is correct.'),
      task('Filter', 'Filter values that match a predicate.', 'Only matching values remain.'),
      task('Refactor loop', 'Replace a search loop with iterator adapters.', 'The result stays the same.'),
      task('Pipeline', 'Chain `filter`, `map`, and `collect`.', 'The pipeline output is correct.')
    ]
  },
  {
    title: 'More about Cargo and Crates.io',
    exercises: [
      task('Release profile', 'Add a `[profile.release]` setting.', 'Cargo accepts the profile.'),
      task('Doc comments', 'Document a public `add_one` function.', '`cargo doc` includes the comment.'),
      task('Crate docs', 'Add crate-level docs for a tiny library.', 'The library has top-level docs.'),
      task('Package metadata', 'Fill in package metadata in `Cargo.toml`.', 'The manifest has useful metadata.'),
      task('Workspace', 'Create a workspace with two members.', 'Both members build together.'),
      task('Path dependency', 'Make one workspace crate use another.', 'The dependent crate compiles.'),
      task('Feature flag', 'Add a feature that changes printed output.', 'The feature toggles behavior.'),
      task('cargo install', 'Install a tiny binary with `cargo install --path .`.', 'The installed command runs.'),
      task('Custom command', 'Create a `cargo-hello` command.', '`cargo hello` prints a message.'),
      task('SemVer', 'Choose a compatible dependency version.', 'The version requirement is valid.')
    ]
  },
  {
    title: 'Smart Pointers',
    exercises: [
      task('Box<T>', 'Store a value on the heap with `Box<T>`.', 'Dereferencing prints the value.'),
      task('Recursive type', 'Build a tiny recursive list with `Box<T>`.', 'The list type has a finite size.'),
      task('Deref', 'Implement `Deref` for a custom smart pointer.', 'Dereference syntax works.'),
      task('Drop', 'Print a message when a value is dropped.', 'Drop runs at scope end.'),
      task('Rc<T>', 'Share one value with cloned `Rc<T>` pointers.', 'The strong count changes.'),
      task('RefCell<T>', 'Mutate data through `RefCell<T>`.', 'Runtime borrowing succeeds.'),
      task('Interior mutability', 'Record messages through an immutable interface.', 'The messages are stored.'),
      task('Borrow panic', 'Trigger and then fix a `RefCell` borrow panic.', 'The fixed code avoids the panic.'),
      task('Weak<T>', 'Store a parent link with `Weak<T>`.', 'The parent link does not create ownership.'),
      task('Cycle cleanup', 'Break a reference cycle with `Weak<T>`.', 'Strong counts can reach zero.')
    ]
  },
  {
    title: 'Fearless Concurrency',
    exercises: [
      task('Spawn thread', 'Spawn a thread that prints five messages.', 'Both threads run.'),
      task('Join handle', 'Join a thread before `main` exits.', 'All thread output appears.'),
      task('move closure', 'Move a vector into a spawned thread.', 'The thread owns the vector.'),
      task('Channel send', 'Send one message over a channel.', 'The receiver prints the message.'),
      task('Multiple producers', 'Send messages from two producers.', 'All messages are received.'),
      task('Mutex<T>', 'Protect a counter with `Mutex<T>`.', 'The counter updates safely.'),
      task('Arc<T>', 'Share a counter across threads with `Arc`.', 'All threads update one counter.'),
      task('Lock scope', 'Release a mutex lock before doing extra work.', 'No thread waits unnecessarily.'),
      task('Send and Sync', 'Fix thread code that uses the wrong shared type.', 'The fixed type is thread safe.'),
      task('Coordination', 'Send a shutdown message to worker threads.', 'Workers stop cleanly.')
    ]
  },
  {
    title: 'Fundamentals of Asynchronous Programming: Async, Await, Futures, and Streams',
    exercises: [
      task('async fn', 'Write an async function and await it.', 'The awaited value prints.'),
      task('Future value', 'Store an async block in a variable.', 'The future runs when awaited.'),
      task('await points', 'Print before and after an `.await`.', 'The output shows the wait point.'),
      task('join', 'Await two futures with `join`.', 'Both futures complete.'),
      task('race', 'Race two futures and print the first result.', 'Only the first result wins.'),
      task('Task spawn', 'Spawn a task that sends a message.', 'The message is received.'),
      task('Streams', 'Consume a stream with `next().await`.', 'Each stream item prints.'),
      task('Pinning', 'Pin futures before storing them in a vector.', 'The vector of futures compiles.'),
      task('Tasks vs threads', 'Write one thread sleep and one async sleep example.', 'The examples show the difference.'),
      task('Structured concurrency', 'Wait for all spawned async work before exiting.', 'No task is left unfinished.')
    ]
  },
  {
    title: 'Object Oriented Programming Features',
    exercises: [
      task('Encapsulation', 'Hide fields and expose methods on a struct.', 'Invalid state cannot be set directly.'),
      task('Trait objects', 'Store two drawable values in `Vec<Box<dyn Draw>>`.', 'Each item can be drawn.'),
      task('Dynamic dispatch', 'Call the same method on different trait objects.', 'Each concrete type behaves differently.'),
      task('Screen example', 'Build a small screen that runs components.', 'Every component is rendered.'),
      task('State pattern', 'Model draft, review, and published states.', 'Only published content is visible.'),
      task('Type-state', 'Use types to prevent publishing before review.', 'Invalid transitions do not compile.'),
      task('Object safety', 'Fix a trait so it can be used as a trait object.', '`dyn Trait` becomes valid.'),
      task('Composition', 'Compose behavior with fields instead of inheritance.', 'The composed type delegates work.'),
      task('Enum alternative', 'Replace trait objects with an enum.', 'The enum handles each variant.'),
      task('API boundary', 'Expose a small public API for a stateful type.', 'Callers cannot skip required steps.')
    ]
  },
  {
    title: 'Patterns and Matching',
    exercises: [
      task('match arms', 'Match three numeric cases and a fallback.', 'Every input has an output.'),
      task('if let', 'Use `if let` to handle one enum variant.', 'Other variants are ignored.'),
      task('while let', 'Pop values from a stack with `while let`.', 'The loop stops when empty.'),
      task('Struct destructuring', 'Destructure a point into `x` and `y`.', 'Both fields are used.'),
      task('Enum destructuring', 'Destructure enum data in a match arm.', 'The inner data is printed.'),
      task('Nested destructuring', 'Match nested structs and enums.', 'The nested value is extracted.'),
      task('Match guards', 'Add a guard to one match arm.', 'The guard changes the matched case.'),
      task('@ bindings', 'Bind and test a value with `@`.', 'The bound value is printed.'),
      task('Ranges', 'Match a number or char range.', 'Values in range use the right arm.'),
      task('Ignored values', 'Ignore unused fields with `..` or `_`.', 'Only needed values are bound.')
    ]
  },
  {
    title: 'Advanced Features',
    exercises: [
      task('unsafe block', 'Dereference a raw pointer in an unsafe block.', 'The unsafe block is minimal.'),
      task('Unsafe function', 'Call an unsafe function inside `unsafe`.', 'The safety boundary is visible.'),
      task('split_at_mut', 'Recreate the idea behind `split_at_mut`.', 'The two slices do not overlap.'),
      task('Associated types', 'Define a trait with an associated type.', 'The implementor chooses the item type.'),
      task('Default generic type', 'Use a default generic type parameter.', 'The default works without annotation.'),
      task('Newtype pattern', 'Wrap a vector in a newtype and implement `Display`.', 'The wrapper prints cleanly.'),
      task('Type alias', 'Replace a long `Result` type with an alias.', 'The function signature is shorter.'),
      task('Function pointer', 'Pass a function pointer into a helper.', 'The helper calls the function.'),
      task('Returned closure', 'Return a boxed closure from a function.', 'The returned closure can be called.'),
      task('macro_rules!', 'Write a small macro that builds a vector.', 'The macro expands to valid code.')
    ]
  },
  {
    title: 'Final Project: Building a Multithreaded Web Server',
    exercises: [
      task('TCP listener', 'Bind a `TcpListener` to localhost.', 'The listener accepts connections.'),
      task('HTTP request', 'Read and print the first request line.', 'The request line is visible.'),
      task('Response', 'Write a tiny HTTP response to the stream.', 'The browser receives a response.'),
      task('Routing', 'Return different bodies for `/` and `/sleep`.', 'Each route has the right body.'),
      task('Thread pool', 'Create a `ThreadPool::new` constructor.', 'Invalid sizes are rejected.'),
      task('Worker', 'Spawn workers that wait for jobs.', 'Workers receive jobs from the pool.'),
      task('Message passing', 'Send boxed jobs through a channel.', 'A worker executes each job.'),
      task('Graceful shutdown', 'Tell workers to stop before dropping the pool.', 'Workers exit cleanly.'),
      task('Error handling', 'Handle connection errors without stopping the server.', 'Bad connections are logged.'),
      task('Refactoring', 'Extract request handling into a small function.', 'Server behavior stays the same.')
    ]
  }
];

function task(concept, prompt, expectedBehavior) {
  return { concept, title: concept, prompt, expectedBehavior };
}

function starterCode(chapterNumber, exerciseNumber, exercise) {
  const functionName = `chapter_${chapterNumber}_exercise_${exerciseNumber}`;
  return `fn main() {
    println!("Chapter ${chapterNumber}, exercise ${exerciseNumber}: ${escapeRustString(exercise.concept)}");
    ${functionName}();
}

fn ${functionName}() {
    // TODO: ${exercise.prompt}
    println!("TODO");
}
`;
}

function escapeRustString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const exercises = {};

chapters.forEach((chapter, index) => {
  const chapterNumber = index + 1;
  exercises[String(chapterNumber)] = chapter.exercises.map((exercise, exerciseIndex) => {
    const exerciseNumber = exerciseIndex + 1;

    return {
      id: `ch${String(chapterNumber).padStart(2, '0')}-ex${String(exerciseNumber).padStart(2, '0')}`,
      chapterNumber,
      title: exercise.title,
      conceptFocus: exercise.concept,
      prompt: exercise.prompt,
      workspaceSetup: 'Open the starter project, then edit the Rust files needed for this exercise.',
      starterCode: starterCode(chapterNumber, exerciseNumber, exercise),
      expectedBehavior: exercise.expectedBehavior,
      hints: [
        `Review Chapter ${chapterNumber}.`,
        `Focus on ${exercise.concept}.`
      ]
    };
  });
});

fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(path.join(assetsDir, 'exercises.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  chapters: exercises
}, null, 2)}\n`);

console.log('Generated 210 concise chapter exercises for chapters 1-21');
