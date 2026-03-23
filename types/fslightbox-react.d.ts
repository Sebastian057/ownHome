declare module 'fslightbox-react' {
  import { ComponentType } from 'react';

  interface FsLightboxProps {
    toggler: boolean;
    sources: string[];
    sourceIndex?: number;
    type?: string;
    types?: string[];
    disableLocalStorage?: boolean;
    openOnMount?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    onInit?: (instance: unknown) => void;
  }

  const FsLightbox: ComponentType<FsLightboxProps>;
  export default FsLightbox;
}
