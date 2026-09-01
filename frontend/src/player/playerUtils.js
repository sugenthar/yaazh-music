export const REPEAT_MODES = ['off', 'all', 'one'];

export const getRepeatIcon = (mode) => {
  switch (mode) {
    case 'all':
      return 'repeat';
    case 'one':
      return 'repeat-one';
    default:
      return 'repeat';
  }
};