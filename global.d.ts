import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'hover-tilt': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'tilt-factor'?: string | number;
        'scale-factor'?: string | number;
      };
    }
  }
}