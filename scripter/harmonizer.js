//*********************** Copyright © 2024 Jonathon Bell. All rights reserved.
//*
//*
//*  Version : $Header:$
//*
//*
//*  Purpose : Harmonizes pitches using a specified scale and chord vociing.
//*
//*            The GUI specifies a Scale as:
//*
//*              a Root note, represented as an integer in the range [0, 12).
//*
//*              a Chord Scale, represented as a sequence of positive integers
//*              that sums to 12.
//*
//*            and a Chord Voicing as a set of Voices, each comprising:
//*
//*              a Degree, represented as a positive integral number of scale
//*              steps to transpose the incoming pitch by.
//*
//*              an Octave, an integral offset
//*
//*   Chord Scale
//*   voicing
//*   degree
//*
//*  pitch
//*  note
//*
//*  See Also: https://www.musios.app/logic-pro-scripter/
//*            for an alternate description of the Logic Pro Scripter API.
//*                                                                     0-0
//*                                                                   (| v |)
//**********************************************************************w*w***

const scales =
[
// Chromatic

  [[1,1,1,1,1,1,1,1,1,1,1,1], "Chromatic"                                   ],

// Symmetric Diminished

  [[2,1,2,1,2,1,2,1],         "Whole Half"                                  ],
  [[1,2,1,2,1,2,1,2],         "Half Whole"                                  ],

// Diatonic

  [[2,2,1,2,2,2,1],           "Ionian - Major"                              ],
  [[2,1,2,2,2,1,2],           "Dorian"                                      ],
  [[1,2,2,2,1,2,2],           "Phrygian"                                    ],
  [[2,2,2,1,2,2,1],           "Lydian"                                      ],
  [[2,2,1,2,2,1,2],           "Myxolydian"                                  ],
  [[2,1,2,2,1,2,2],           "Aeolian - Minor"                             ],
  [[1,2,2,1,2,2,2],           "Locrian"                                     ],

// Melodic Minor

  [[2,1,2,2,2,2,1],           "Melodic Minor"                               ],
  [[1,2,2,2,2,1,2],          "Dorian ♭2 - Phrygian ♮6"                      ],
  [[2,2,2,2,1,2,1],          "Lydian ♯5 - Lydian Augmented" ],
  [[2,2,2,1,2,1,2],          "Lydian ♭7 - Lydian Dominant"],
  [[2,2,1,2,1,2,2],           "Mixolydian ♭6 - Melodic Major"               ],
  [[2,1,2,1,2,2,2],          "Dorian ♭5 - Locrian ♮2 - Half Diminished"     ],
  [[1,2,1,2,2,2,2],           "Altered Dominant - Superlocrian"             ],

// Harmonic Minor

  [[2,1,2,2,1,3,1],           "Harmonic Minor"                              ],
  [[1,2,2,1,3,1,2],           "Locrian ♯6"                                  ],
  [[2,2,1,3,1,2,1],           "Ionian ♯5 - Ionian Augmented"                ],
  [[2,1,3,1,2,1,2],           "Dorian ♯4 - Romanian"                        ],
  [[1,3,1,2,1,2,2],           "Phrygian ♯3 - Phrygian Dominant"             ],
  [[1,2,1,2,2,1,3],           "Myxolydian ♯1 - Ultralocrian"                ],
  [[3,1,2,1,2,2,1],           "Lydian ♯2"                                   ],

// Double Harmonic

  [[1,3,1,2,1,3,1],           "Double Harmonic - Arabic - Gypsy - Byzantine"],
  [[3,1,2,1,3,1,1],           "Lydian ♯2 ♯6"                                ],
  [[1,2,1,3,1,1,3],           "Ultraphrygian"                               ],
  [[2,1,3,1,1,3,1],           "Hungarian Minor"                             ],
  [[1,3,1,1,3,1,2],           "Oriental"                                    ],
  [[3,1,1,3,1,2,1],           "Ionian Augmented ♯2"                         ],
  [[1,1,3,1,2,1,3],           "Locrian 𝄫3 𝄫7"                               ],

// Hexatonic

  [[2,2,2,2,2,2],             "Whole Tone"                                  ],
  [[2,2,2,3,1,2],             "Prometheus"                                  ],
  [[3,1,3,1,3,1],             "Augmented"                                   ],
  [[1,2,3,1,3,2],             "Tritone"                                     ],
  [[3,2,1,1,3,2],             "Blues"                                       ],

// Pentatonic

  [[2,2,3,2,3],               "Major Pentatonic"                            ],
  [[2,3,2,3,2],               "Suspended Pentatonic - Egyptian"             ],
  [[3,2,3,2,2],               "Blues Minor Pentatonic - Man Gong"           ],
  [[2,3,2,2,3],               "Blues Major Pentatonic - Ritusen"            ],
  [[3,2,2,3,2],               "Minor Pentatonic"                            ],
];

const voices = 6;

var chords;

function HandleMIDI(e)
{
  if (e instanceof Note)
  {
    const p = e.pitch;

    for (const i of chords.get(p % 12))
    {
      e.pitch = p + i;
      e.send();
    }
  }
  else
  {
    e.send();
  }
}

function ParameterChanged(_, _)
{
  chords  = new Map(Array.from({length: 12}, (_, i) => [i, []]));
  const s = scale();
  let   n = root();

  for (let i = 0; i!=s.length; ++i)
  {
    const c = [];

    for (let v = 0; v != voices; ++v)
    {
      if (enabled(v))
      {
        c.push(sum(s, i, i + degree(v)) + octave(v));
      }
    }

    chords.set(n, c);
    n = (n + s[i]) % 12;
  }
}

//****************************************************************************

var PluginParameters =
[
  {
    name:           "Scale Root",
    type:           'menu',
    valueStrings:   ["C", "C♯ - D♭", "D", "D♯ - E♭", "E", "F", "F♯ - G♭", "G", "G♯ - A♭", "A", "A♯ - B♭", "B"],
    defaultValue:   0,
  }
  ,
  {
    name:           "Chord Scale",
    type:           'menu',
    valueStrings:   scales.map((s, _) => s[1]),
    defaultValue:   0,
  }
];

for (let v = voices; v > 0; --v)
{
  PluginParameters.push(
  {
    name:           voice_parameter_name(v-1, "Octave"),
    type:           "menu",
    valueStrings:   ["+2", "+1", "0", "-1", "-2", "Off"],
    defaultValue:   v==1 ? 2 : 5,
  });

}

for (let v = voices; v > 0; --v)
{
  PluginParameters.push(
  {
    name:           voice_parameter_name(v-1, "Degree"),
    type:           "lin",
    minValue:       1,
    maxValue:       13,
    numberOfSteps:  12,
    defaultValue:   0,
  });
}

//****************************************************************************

function voice_parameter_name(v, p)
{
  return "Voice " + (v + 1) + " " + p;
}

function voice_parameter(v, p)
{
  return GetParameter(voice_parameter_name(v, p));
}

function enabled(v)
{
  return voice_parameter(v, "Octave") != 5;
}

function degree(v)
{
  return voice_parameter(v, "Degree") - 1;
}

function octave(v)
{
  return  [+24, +12, 0, -12, -24][voice_parameter(v, "Octave")];
}

function scale()
{
  return scales[GetParameter("Chord Scale")][0];
}

function root()
{
  return GetParameter("Scale Root");
}

/**
 * Sums the elements of the given array in the range '[i, j]'.
 *
 * @param  s  An array of integers.
 * @param  f  An index to sum from.
 * @param  t  An index to sum to.
 *
 * @return The sum of the elements of 's' in the range '[i, j)'.
 */
function sum(s, i, j)
{
  let r = 0;

  while (i != j)
  {
    r += s[i++ % s.length];
  }

  return r;
}

//****************************************************************************
