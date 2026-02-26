# Pedalling and Legato

Many synthesizers are built upon the keyboard model where notes begin and end when you press and release a key. Generally speaking, when you press a key, then you call a `triggerAttack(note,velocity)` method, and when you release the key you call a `triggerRelease(note)` method.

When dealing with sequencers, it's a little bit more ambiguous. When to trigger the attack is pretty obvious (at every step of the sequence) - but when to trigger the release is less clear. Generally, there will be a `gate length` parameter, which indicates how long between the 'press' and 'release' of the key, or on other words, the interval between calling `triggerAttack` and `triggerRelease`.

In our context, this parameter is called ` duration`, and is measured in seconds. So if we set `s.duration = 1` then there will be one second between when the attack and release are triggered. 

Note that since the time between the attack and release is fixed, for convenience sequencers call `triggerAttackRelease(note, duration, velocity)`, which schedules both the attack and the release according to the duration parameter.

## Using the piano 'sustain' pedal

The piano's sustain pedal causes notes to continue ringing after the key is released. (Note that this is a different use of sustain than the sustain of an envelope.) 

The way to think about this is that when the pedal is held `triggerAttack` is called when a key is pressed, but `triggerRelease` is never called. This causes the note to sustain indefinitely. 

On the piano, you can just hold the pedal down forever, and the notes will gradually fade out to silence. In practice, doing this causes a very muddy sound as all of the notes blend together. Most of this time, pianists press and release the pedal in order to shape when notes are muted. In a piano score you will see a symbol 'Ped' for when to press the sustain pedal, and another symbol `*` for when to release the sustain pedal.

On a synthesizer, however, the notes will continue at their sustain amplitude forever. We need to have some way of telling the synthesizer went to release the envelope. In our implementation: 

* calling s.pedal() suppresses the release of all notes.
* calling s.star() trigger the release of all sounding notes.
* in a sequence, we can just use the star symbol `*` to indicate lifting the pedal, e.g. `'0 1 2 *'`.

## Legato

In the above model we are using a duration to determine how long a note is played for. But it is common to use a different model, where each note is held down until the next note is played. This method of playing where notes are sustained to create a continuous line is called *legato*.

* calling `s.pedal('legato')` causes the sequencer to release all previous notes immediately before triggering a new note. Thus the duration of the sequencer is ignored.
* `'[0,2,4] [1,3,5]` will cause the first chord to play together, and the release for `'[0,2,4]` will occur right before `'[1,3,5]` is played.

## pedal per sequence, star per synth

Importantly, the star mode is *per synth* not per sequence, so calling `*` in one sequence instance will release the all of the notes the synth is currently playing. If you want independent control of release for a synthesizer it is easier to just create multiple synthesizers (e.g. `s1`, `s2`, etc.)

But the pedal mode itself is per sequence, so you can mix and match.

## Summary

* `s.pedal()` or `s.pedal('full')` enables pedalling, where notes sustain indefinitely.
* `s.pedal('legato')` enables legato more, where notes sustain until the next note is played.
* `s.pedal('off')` disables pedalling, and triggers are released for all notes immediately.
* `s.star()` or `s.sequence('0 *')` momentarily releases, all playing notes, but does not change the pedal mode.
* `s.star()` will call all sounding notes to release even when pedal is set to off.
* note that the `Simpler` instrument is implemented slightly differently than the other synths, but should work the same.


---