# Vertex Station — Sound Credits

All sounds for Vertex Station are **synthesized in real time** with the Web Audio API
(`src/ps5-audio.ts`). There are no audio files, samples, or recordings in this project.

## Generation
- All effects use pure oscillators (sine / triangle / square) and procedurally generated
  filtered white-noise sweeps.
- The ambient music layer is a live-generated chord progression (triangle + sine voices at
  87–260 Hz with a slow gain LFO and a lowpassed noise bed), cycled every ~8 seconds.

## Provenance
- No audio from the Sony PlayStation consoles, headphones, or the web reference console
  was used, recorded, or bundled.
- No third-party, copyrighted, or trademarked sounds are included.
- Nothing here requires an Internet connection to play.

## License statement
The generated waveforms are original output of this codebase and are public domain /
unrestricted by construction.