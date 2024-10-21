//*********************** Copyright © 2024 Jonathon Bell. All rights reserved.
//*
//*
//*  Version : $Header:$
//*
//*
//*  Purpose : Harmonizes pitches using a specified scale and chord voicing.
//*
//*
//*  Glossary: We use the following terminology here:
//*
//*   pitch    An integer in the range [0, 127] representing an even tempered
//*            pitch; the value of the 'pitch' attribute of a 'Note' event.
//*
//*   note     An integer in the range [0, 11] representing the set of pitches
//*            { n + 12 * i | i ∊ ℤ }.
//*
//*   interval The natural number of half-steps between two notes or pitches.
//*
//*   type     A sequence of non-zero intervals that sums to 12.
//*
//*   root     The first note of a scale.
//*
//*   scale    A sequence of one or more distinct notes, arranged in ascending
//*            cyclic order; specified as a <root, type> pair.
//*
//*   degree   An index into a scale type, and thus a number of scale steps to
//*            ascend from a pitch when harmonizing it.
//*
//*   octave   An integral number of octaves with which to further offset the
//*            harmonized pitch.
//*
//*   voice    Describes how to create a single harmony with which to augment
//*            the incoming pitch; specified as a <degree, octave> pair.
//*
//*   voicing  A (possibly empty) set of voices.
//*
//*   chord    A (possibly empty) set of intervals.
//*
//*  Overview: The GUI specifies a scale as a root note and scale-type pair,
//*            and a voicing as a set of voices, each comprising a degree and
//*            octave pair.
//*
//*            The function 'ParameterChanged' compiles the specification into
//*            a map that associates each of the 12 notes with a chord; a note
//*            contained within the specified scale maps to the diatonic chord
//*            rooted at that note, while other notes map to the empty chord.
//*
//*            This representation minimizes the work that 'HandleEvent' needs
//*            to perform for each 'Note' event.
//*
//*  See Also: https://www.musios.app/logic-pro-scripter/
//*            for an alternate description of the Logic Pro Scripter API.
//*
//*                                                                     0-0
//*                                                                   (| v |)
//**********************************************************************w*w***

const scale_types =
[
  [[1,1,1,1,1,1,1,1,1,1,1,1], "Chromatic"                                   ],

  [[], "-"],

  [[2,1,2,1,2,1,2,1],         "Whole Half"                                  ],
  [[1,2,1,2,1,2,1,2],         "Half Whole"                                  ],

  [[], "-"],

  [[2,2,1,2,2,2,1],           "Ionian, Major"                               ],
  [[2,1,2,2,2,1,2],           "Dorian"                                      ],
  [[1,2,2,2,1,2,2],           "Phrygian"                                    ],
  [[2,2,2,1,2,2,1],           "Lydian"                                      ],
  [[2,2,1,2,2,1,2],           "Myxolydian"                                  ],
  [[2,1,2,2,1,2,2],           "Aeolian, Minor"                              ],
  [[1,2,2,1,2,2,2],           "Locrian"                                     ],

  [[], "-"],

  [[2,1,2,2,2,2,1],           "Melodic Minor"                               ],
  [[1,2,2,2,2,1,2],           "Dorian ♭2, Phrygian ♮6"                      ],
  [[2,2,2,2,1,2,1],           "Lydian ♯5, Lydian Augmented"                 ],
  [[2,2,2,1,2,1,2],           "Lydian ♭7, Lydian Dominant"                  ],
  [[2,2,1,2,1,2,2],           "Mixolydian ♭6, Melodic Major"                ],
  [[2,1,2,1,2,2,2],           "Dorian ♭5, Locrian ♮2, Half Diminished"      ],
  [[1,2,1,2,2,2,2],           "Altered Dominant, Superlocrian"              ],

  [[], "-"],

  [[2,1,2,2,1,3,1],           "Harmonic Minor"                              ],
  [[1,2,2,1,3,1,2],           "Locrian ♯6"                                  ],
  [[2,2,1,3,1,2,1],           "Ionian ♯5, Ionian Augmented"                 ],
  [[2,1,3,1,2,1,2],           "Dorian ♯4, Romanian"                         ],
  [[1,3,1,2,1,2,2],           "Phrygian ♯3, Phrygian Dominant"              ],
  [[1,2,1,2,2,1,3],           "Myxolydian ♯1, Ultralocrian"                 ],
  [[3,1,2,1,2,2,1],           "Lydian ♯2"                                   ],

  [[], "-"],

  [[1,3,1,2,1,3,1],           "Double Harmonic, Arabic, Gypsy, Byzantine"   ],
  [[3,1,2,1,3,1,1],           "Lydian ♯2 ♯6"                                ],
  [[1,2,1,3,1,1,3],           "Ultraphrygian"                               ],
  [[2,1,3,1,1,3,1],           "Hungarian Minor"                             ],
  [[1,3,1,1,3,1,2],           "Oriental"                                    ],
  [[3,1,1,3,1,2,1],           "Ionian Augmented ♯2"                         ],
  [[1,1,3,1,2,1,3],           "Locrian 𝄫3 𝄫7"                               ],

  [[], "-"],

  [[2,2,2,2,2,2],             "Whole Tone"                                  ],
  [[2,2,2,3,1,2],             "Prometheus"                                  ],
  [[3,1,3,1,3,1],             "Augmented"                                   ],
  [[1,2,3,1,3,2],             "Tritone"                                     ],
  [[3,2,1,1,3,2],             "Blues"                                       ],

  [[], "-"],

  [[2,2,3,2,3],               "Major Pentatonic"                            ],
  [[2,3,2,3,2],               "Suspended Pentatonic, Egyptian"              ],
  [[3,2,3,2,2],               "Blues Minor Pentatonic, Man Gong"            ],
  [[2,3,2,2,3],               "Blues Major Pentatonic, Ritusen"             ],
  [[3,2,2,3,2],               "Minor Pentatonic"                            ],
];

/**
 * The maximum number of voices available in a voicing.
 */
const voices = 7;

/**
 * Maps each note of the chromatic scale to a chord of the current scale.
 */
var chords = undefined;

/**
 * True if the chord map is no longer synchronized with the GUI.
 *
 * Signals to the idle thread that the GUI needs updating.
 *
 * Used to avoid the function 'ParameterChanged' from recursing.
 */
var dirty = false;

/**
 * Retrieves the chord associated with an incoming pitch and instantiates it.
 *
 * @parm e The event to process.
 */
function HandleMIDI(e)
{
  if (e instanceof Note)                                 // Some sort of Note?
  {
    const p = e.pitch;                                   // ...save its pitch

    for (const i of chords.get(p % 12))                  // ....each interval
    {
      e.pitch = p + i;                                   // .....adjust pitch
      e.send();                                          // .....and send it
    }
  }
  else
  {
    e.send();                                            // ...send as normal
  }
}

/**
 * Recompiles the chord map, and signals to 'Idle' that it may need to update
 * the GUI.
 *
 * @parm p The index of the parameter that has changed.
 * @parm v The value of the parameter that has changed.
 */
function ParameterChanged(p, v)
{
  dirty = false;                                         // Avoid a recursion
  const r = scale_root();                                // The selected root
  const s = scale_type();                                // The selected type
  let   n = r;                                           // The current note
  let   m = "";                                          // The scale string

  /* Map each note of the chromatic scale to the empty chord...*/

  chords = new Map(Array.from({length: 12}, (_, i) => [i, []]));

  /* Now, for each note of the selected scale, update its chord...*/

  for (let i = 0; i !== s.length; ++i)                   // For each scale tone
  {
    const c = chords.get(n);                             // ...fetch its chord

    for (let v = 0; v !== voices; ++v)                   // ...for each voice
    {
      if (voice_enabled(v))                              // ....is it enabled?
      {
        /* Compute the interval above an incoming pitch at which this voice
           sounds...*/

        c.push(sum(s, i, i + voice_degree(v)) + voice_octave(v));
      }
    }

    m += " " + note_name(n, r);                         // ...append note name
    n += s[i]                                           // ...advance the note
    n %= 12;                                            // ...and wrap around
  }

  /* If the selected scale has just changed, we must also update the GUI...*/

  if (p == 0 || p ==1)                                 // Has scale changed?
  {
    PluginParameters[2].valueStrings = [m, "", ""];    // ...update the notes

    /* If the length of the selected scale has changed, adjust the range of
      the degree sliders...*/

    if (s.length !== PluginParameters[3 + voices].maxValue)
    {
      for (let p = 3 + voices; p !== 3 + 2 * voices; ++p)
      {
        PluginParameters[p].maxValue      = s.length;
        PluginParameters[p].numberOfSteps = s.length - 1;
      }
    }

    dirty = true;                                        // ...update the GUI
  }
}

/**
 * Update the GUI if the selected scale has changed.
 */
function Idle()
{
  if (dirty)                                             // No longer in sync?
  {
    UpdatePluginParameters();                            // ...update the GUI
  }
}

//****************************************************************************

var PluginParameters =
[
  {
    name:           "Scale Root",
    type:           "menu",
    valueStrings:   ["C", "C♯, D♭", "D", "D♯, E♭", "E", "F", "F♯, G♭", "G", "G♯, A♭", "A", "A♯, B♭", "B"],
    defaultValue:   0,
  }
  ,
  {
    name:           "Scale Type",
    type:           "menu",
    valueStrings:   scale_types.map((s, _) => s[1]),
    defaultValue:   0,
  }
  ,
  {
    name:           "Scale Notes",
    type:           "menu",
    valueStrings:   ["", "", ""],
    defaultValue:   0,
    readOnly:       true,
  }
];

for (let v = voices; v > 0; --v)
{
  PluginParameters.push(
  {
    name:           voice_parameter_name(v-1, "Octave"),
    type:           "menu",
    valueStrings:   ["+2", "+1", "0", "-1", "-2", "Off"],
    defaultValue:   v === 1 ? 2 : 5,
  });

}

for (let v = voices; v > 0; --v)
{
  PluginParameters.push(
  {
    name:           voice_parameter_name(v-1, "Degree"),
    type:           "lin",
    minValue:       1,
    maxValue:       12,
    numberOfSteps:  11,
    defaultValue:   0,
  });
}

Trace("Harmonizer 1.1 - https://github.com/jonathon-bell/logic-pro/")

//****************************************************************************

/**
 * The currently selected scale root.
 */
function scale_root()
{
  return GetParameter(0);
}

/**
 * The currently selected scale type.
 */
function scale_type()
{
  return scale_types[GetParameter(1)][0];
}

/**
 * True if the given voice is enabled (i.e. not "Off").
 *
 * @param  v  The specified voice.
 */
function voice_enabled(v)
{
  return voice_parameter(v, "Octave") < 5;
}

/**
 * The integral number of half steps to offset the harmonized pitch associated
 * with this voice.
 *
 * @param  v  The specified voice.
 *
 * @return An integer in the range [-24, +24].
 */
function voice_octave(v)
{
  return [+24, +12, 0, -12, -24][voice_parameter(v, "Octave")];
}

/**
 * The number of scale steps to ascend when harmonizing a pitch.
 *
 * @param  v  The specified voice.
 *
 * @return An integer in the range [0, 'scale_type().length').
 */
function voice_degree(v)
{
  return voice_parameter(v, "Degree") - 1;
}

/**
 * The index of the given parameter of the given voice.
 *
 * @param  v  The given voice.
 * @param  p  The given voice parameter; "Degree" or "Octave".
 *
 * @return The index of the given voice parameter.
 */
function voice_parameter_index(v, p)
{
  return 3
       + (p === "Degree" ? voices : 0)
       + (voices - v - 1)
}

/**
 * The value of the given parameter of the given voice.
 *
 * @param  v  The given voice.
 * @param  p  The given voice parameter; "Degree" or "Octave".
 *
 * @return The value of the given voice parameter.
 */
function voice_parameter(v, p)
{
  return GetParameter(voice_parameter_index(v, p));
}

/**
 * The name of the given parameter of the given voice.
 *
 * @param  v  The given voice.
 * @param  p  The given voice parameter; "Degree" or "Octave".
 *
 * @return The name of the given voice parameter.
 */
function voice_parameter_name(v, p)
{
  return "Voice " + (v + 1) + " " + p;
}

/**
 * The name of the given note, seen as an element of the given key.
 *
 * The integer '1322' is acting as a 12 bit set; a bit set in the position 'r'
 * indicates that 'r' is the root of a key whose accidentals are traditionally
 * expressed as flats rather than sharps.
 *
 * @param  n  The given note.
 * @param  r  The root note of the parent key.
 *
 * @return The name of the given note.
 */
function note_name(n, r = 0)
{
  return [
    ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"],
    ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"],
  ][1322 & (1 << r % 12) ? 1 : 0][n % 12];
}

/**
 * Sums the elements of the given array with indices in the range [i, j).
 *
 * Indices 'wrap around' at the end of the array.
 *
 * For example:
 *
 *  sum([1, 2, 3], 0, 2)   ==   1 + 2
 *
 *  sum([1, 2, 3], 1, 2)   ==   2
 *
 *  sum([1, 2, 3], 0, 4)   ==   1 + 2 + 3 + 1
 *
 * @param  a  An array of integers.
 * @param  i  An index to sum from.
 * @param  j  An index to sum to.
 *
 * @return The sum of the elements of 'a' with indices in the range [i, j).
 */
function sum(a, i, j)
{
  let s = 0;

  while (i !== j)
  {
    s += a[i++ % a.length];
  }

  return s;
}

//****************************************************************************
