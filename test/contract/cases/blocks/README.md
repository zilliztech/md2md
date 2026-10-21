# Named-block contract, schemaVersion 1

Each JSON file is self-contained and has no external dependencies. Consumers
call `parseBlocks(input.content, options)` and compare the complete result with
`expected.parse`. When `expected.parse.ok` is true, call
`stripBlockMarkers(input.content)` and compare it byte-for-byte with
`expected.strip`. A null `expected.strip` means the caller must not publish or
strip invalid input. `input.file` records the logical source filename.

`requirements` supplies the IDs used in the shared contract test names. Error
messages, one-based positions, empty results on failure, and preservation of
line endings are part of these fixtures. zdoc should copy this directory from
the exact md2md version it pins, and run the same cases against its substitute
before switching to the published package.
