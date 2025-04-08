declare module '@chakra-ui/react';
declare module 'lucide-react';
declare module 'uuid';

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_BASEPATH: string;
    NEXT_PUBLIC_ADMIN_API_KEY: string;
    [key: string]: string | undefined;
  }
}
