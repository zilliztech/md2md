# Preprocess contracts

Each JSON file supplies `input` arguments (without `fragmentRoot`), UTF-8 `files`
keyed by root-relative path, optional `symlinks` mapping link paths to link targets,
and `expected` results. Create the files and links in a temporary directory and
pass that directory as `fragmentRoot`. The root and its ancestors may be symlinks.
Never canonicalize paths below the root: symlinks in `fragments/` or any of its
children must still be rejected.

Compare `ok`, `content`, `dependencies`, and error `code`, `file`, `line`, `detail`
exactly, including array order. Error messages must be nonempty but their wording
is not contractual. Check `engine` against the tested package's name and exact
version. `expected.throws` instead requires the named exception. All fixtures are
run by `test/preprocess/contract.test.js` and can be reused by zdoc.

Paths are slash-separated and relative to `fragmentRoot`. Dependency sources are
distinct immediate filenames in first-use order; variable keys are lowercase.
The default source name is `<input>`. Limits are nonnegative safe integers;
omitted fields use the documented defaults. Depth starts at 1, fragment count is
per distinct file read, and repeated output counts every occurrence's UTF-8 bytes.
Cycles report the fragment reference chain, including the repeated final path.
Unsupported site marks in inserted variable values remain literal, like all
other inserted text. Ambiguous sibling variable keys throw `TypeError`, including
in unused namespaces. A referenced non-scalar value is `VAR_NOT_SCALAR`.
