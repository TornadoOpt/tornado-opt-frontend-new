"use client";
import { type FC } from "react";

import { HStack, Heading } from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { DarkModeButton } from "../DarkModeButton";

const Header: FC = () => {
  return (
    <HStack
      as="header"
      p="1.5rem"
      position="sticky"
      top={0}
      zIndex={10}
      justifyContent="space-between"
    >
      <HStack>
        <Heading as="h1" fontSize="1.5rem" className="text-shadow">
          TornadoOpt
        </Heading>
      </HStack>

      <HStack>
        <ConnectButton />
        <DarkModeButton />
      </HStack>
    </HStack>
  );
};

export default Header;
