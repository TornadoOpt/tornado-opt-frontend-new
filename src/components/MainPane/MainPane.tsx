"use client";

import { useState, type FC } from "react";

import {
  Box,
  Flex,
  Heading,
  Text,
  Stack,
  HStack,
  VStack,
  Badge,
  Input,
  Button,
  InputGroup,
  Separator,
  Card,
  Icon,
  Grid,
  GridItem,
  Container,
} from "@chakra-ui/react";
import { useTheme } from "next-themes";
import { sepolia } from "viem/chains";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

import { tornadoAbi } from "@/abi/tornado";
import styles from "@/styles/mainPane.module.css";
import { wagmiConfig } from "@/wagmi";

import {
  Status,
  Address,
  Balance,
  BlockNumber,
  TransferNative,
  SignMessage,
  Chain,
} from "./components";

const TORNADO_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as `0x${string}`;

// Icons (you can replace with actual icon imports if available)
const DepositIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M2 12h20" />
  </svg>
);

const WithdrawIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const isHex32 = (v: string) => /^0x[0-9a-fA-F]{64}$/.test(v);
const randomHex32 = () =>
  `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;

const MainPane: FC = () => {
  const { isConnected } = useAccount();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  // Enhanced color scheme
  const bgGradient = isDarkMode
    ? "linear(to-br, gray.900, gray.800)"
    : "linear(to-br, gray.50, white)";
  const cardBg = isDarkMode ? "gray.800/80" : "white/80";
  const borderCol = isDarkMode ? "whiteAlpha.200" : "gray.200";
  const accentColor = isDarkMode ? "whiteAlpha.100" : "gray.100";
  const textMuted = isDarkMode ? "gray.400" : "gray.600";

  // ---- reads
  const { data: denom } = useReadContract({
    chainId: sepolia.id,
    address: TORNADO_ADDRESS,
    abi: tornadoAbi,
    functionName: "denomination",
  });
  const { data: hashRoot } = useReadContract({
    chainId: sepolia.id,
    address: TORNADO_ADDRESS,
    abi: tornadoAbi,
    functionName: "hashChainRoot",
  });

  const { writeContractAsync } = useWriteContract();

  // ---- deposit
  const [commitment, setCommitment] = useState<`0x${string}`>(
    ("0x" + "b".repeat(64)) as `0x${string}`,
  );
  const [statusDep, setStatusDep] = useState("");
  const [, setIsDepositLoading] = useState(false);

  const onDeposit = async () => {
    if (!denom) return setStatusDep("denomination() not loaded yet");
    if (!isHex32(commitment)) return setStatusDep("Invalid commitment (bytes32 required)");
    setIsDepositLoading(true);
    setStatusDep("Sending deposit tx...");
    try {
      const hash = await writeContractAsync({
        chainId: sepolia.id,
        address: TORNADO_ADDRESS,
        abi: tornadoAbi,
        functionName: "deposit",
        args: [commitment],
        value: denom as bigint,
      });
      const rcpt = await waitForTransactionReceipt(wagmiConfig, { hash });
      setStatusDep(`✅ Confirmed in block ${rcpt.blockNumber}`);
    } catch (e: any) {
      setStatusDep(`❌ ${e?.shortMessage ?? e?.message ?? String(e)}`);
    } finally {
      setIsDepositLoading(false);
    }
  };

  // ---- withdraw
  const [vmr, setVmr] = useState<`0x${string}`>(("0x" + "a".repeat(64)) as `0x${string}`);
  const [nullifier, setNullifier] = useState<`0x${string}`>(
    ("0x" + "9".repeat(64)) as `0x${string}`,
  );
  const [recipient, setRecipient] = useState<`0x${string}`>(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  );
  const [statusWdr, setStatusWdr] = useState("");
  const [, setIsWithdrawLoading] = useState(false);

  const onCheckpoint = async () => {
    if (!hashRoot) return setStatusWdr("hashChainRoot() not loaded yet");
    if (!isHex32(vmr)) return setStatusWdr("Invalid virtualMerkleRoot (bytes32 required)");
    setIsWithdrawLoading(true);
    setStatusWdr("Sending setCheckpoint...");
    try {
      const hash = await writeContractAsync({
        chainId: sepolia.id,
        address: TORNADO_ADDRESS,
        abi: tornadoAbi,
        functionName: "setCheckpoint",
        args: ["0x", hashRoot as `0x${string}`, vmr],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      setStatusWdr("✅ setCheckpoint confirmed");
    } catch (e: any) {
      setStatusWdr(`❌ ${e?.shortMessage ?? e?.message ?? String(e)}`);
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const onWithdraw = async () => {
    if (!isHex32(vmr) || !isHex32(nullifier)) return setStatusWdr("Invalid bytes32 input(s)");
    setIsWithdrawLoading(true);
    setStatusWdr("Sending withdraw...");
    try {
      const hash = await writeContractAsync({
        chainId: sepolia.id,
        address: TORNADO_ADDRESS,
        abi: tornadoAbi,
        functionName: "withdraw",
        args: ["0x", nullifier, vmr, recipient],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      setStatusWdr("✅ withdraw confirmed");
    } catch (e: any) {
      setStatusWdr(`❌ ${e?.shortMessage ?? e?.message ?? String(e)}`);
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  // Helper function to truncate address
  const truncateAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Container maxW="container.xl" p={0}>
      <Box
        className={styles.container}
        bgGradient={bgGradient}
        borderRadius="2xl"
        p={8}
        position="relative"
        overflow="hidden"
      >
        {/* Background decoration */}
        <Box
          position="absolute"
          top="-50%"
          right="-10%"
          width="60%"
          height="60%"
          borderRadius="full"
          bg={isDarkMode ? "purple.600/10" : "purple.200/20"}
          filter="blur(100px)"
          zIndex={0}
        />

        <Box position="relative" zIndex={1}>
          {/* Header */}
          <VStack gap={2} mb={8} alignItems="flex-start">
            <Heading
              as="h1"
              size="2xl"
              bgGradient="linear(to-r, purple.400, pink.400)"
              bgClip="text"
              fontWeight="bold"
            >
              Tornado Cash Optimized
            </Heading>
            <Text color={textMuted} fontSize="lg">
              Privacy-preserving transactions on Sepolia testnet
            </Text>
          </VStack>

          {/* Contract Status Grid */}
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
            gap={3}
            mb={8}
          >
            <GridItem>
              <Box
                bg={accentColor}
                borderRadius="lg"
                p={3}
                borderWidth="1px"
                borderColor={borderCol}
                _hover={{ borderColor: "purple.400", transform: "translateY(-2px)" }}
                transition="all 0.2s"
              >
                <Text fontSize="xs" color={textMuted} mb={1}>
                  CONTRACT ADDRESS
                </Text>
                <Text fontFamily="mono" fontSize="sm" fontWeight="bold">
                  {truncateAddress(TORNADO_ADDRESS)}
                </Text>
              </Box>
            </GridItem>

            <GridItem>
              <Box
                bg={accentColor}
                borderRadius="lg"
                p={3}
                borderWidth="1px"
                borderColor={borderCol}
                _hover={{ borderColor: "purple.400", transform: "translateY(-2px)" }}
                transition="all 0.2s"
              >
                <Text fontSize="xs" color={textMuted} mb={1}>
                  DENOMINATION
                </Text>
                <Text fontFamily="mono" fontSize="sm" fontWeight="bold">
                  {denom ? `${denom.toString()} wei` : "Loading..."}
                </Text>
              </Box>
            </GridItem>

            <GridItem>
              <Box
                bg={accentColor}
                borderRadius="lg"
                p={3}
                borderWidth="1px"
                borderColor={borderCol}
                _hover={{ borderColor: "purple.400", transform: "translateY(-2px)" }}
                transition="all 0.2s"
              >
                <Text fontSize="xs" color={textMuted} mb={1}>
                  NETWORK
                </Text>
                <HStack gap={2}>
                  <Box w={2} h={2} borderRadius="full" bg="green.400" />
                  <Text fontSize="sm" fontWeight="bold">
                    Sepolia
                  </Text>
                </HStack>
              </Box>
            </GridItem>
          </Grid>

          {/* Main Actions Grid */}
          <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6} mb={8}>
            {/* Deposit Card */}
            <Card.Root
              bg={cardBg}
              backdropFilter="blur(10px)"
              borderWidth="1px"
              borderColor={borderCol}
              borderRadius="xl"
              overflow="hidden"
              _hover={{ borderColor: "teal.400" }}
              transition="all 0.2s"
              padding={3}
            >
              <Box bg="linear-gradient(135deg, teal.500 0%, teal.600 100%)" h={1} />
              <Card.Header pb={4}>
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="teal.500/20">
                    <Icon color="teal.400">
                      <DepositIcon />
                    </Icon>
                  </Box>
                  <Box>
                    <Heading size="md">Deposit</Heading>
                    <Text color={textMuted} fontSize="sm" mt={1}>
                      Deposit {denom?.toString() ?? "..."} wei anonymously
                    </Text>
                  </Box>
                </HStack>
              </Card.Header>

              <Card.Body pt={0}>
                <Stack gap={4}>
                  <Box>
                    <HStack justifyContent="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="semibold">
                        Commitment Hash
                      </Text>
                      <Badge colorPalette={isHex32(commitment) ? "green" : "red"} size="sm">
                        {isHex32(commitment) ? "Valid" : "Invalid"}
                      </Badge>
                    </HStack>
                    <InputGroup>
                      <Input
                        value={commitment}
                        onChange={(e) => setCommitment(e.target.value as `0x${string}`)}
                        fontFamily="mono"
                        fontSize="sm"
                        borderColor={
                          commitment.length > 0 && !isHex32(commitment) ? "red.400" : borderCol
                        }
                        placeholder="0x + 64 hex characters"
                        bg={isDarkMode ? "gray.900/50" : "white"}
                        _focus={{ borderColor: "teal.400", bg: isDarkMode ? "gray.900" : "white" }}
                      />
                    </InputGroup>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="teal"
                      onClick={() => setCommitment(randomHex32())}
                      mt={2}
                      //leftIcon={<RandomIcon />}
                    >
                      Generate Random
                    </Button>
                  </Box>

                  <Button
                    colorPalette="teal"
                    onClick={onDeposit}
                    //isLoading={isDepositLoading}
                    loadingText="Processing..."
                    size="lg"
                    w="full"
                    _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                  >
                    Deposit Funds
                  </Button>

                  {statusDep && (
                    <Box
                      p={3}
                      borderRadius="md"
                      bg={
                        statusDep.includes("✅")
                          ? "green.500/10"
                          : statusDep.includes("❌")
                            ? "red.500/10"
                            : "blue.500/10"
                      }
                      borderWidth="1px"
                      borderColor={
                        statusDep.includes("✅")
                          ? "green.500/30"
                          : statusDep.includes("❌")
                            ? "red.500/30"
                            : "blue.500/30"
                      }
                    >
                      <Text fontSize="xs" fontFamily="mono">
                        {statusDep}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Card.Body>
            </Card.Root>

            {/* Withdraw Card */}
            <Card.Root
              bg={cardBg}
              backdropFilter="blur(10px)"
              borderWidth="1px"
              borderColor={borderCol}
              borderRadius="xl"
              overflow="hidden"
              _hover={{ borderColor: "pink.400" }}
              transition="all 0.2s"
              padding={3}
            >
              <Box bg="linear-gradient(135deg, pink.500 0%, purple.600 100%)" h={1} />
              <Card.Header pb={4}>
                <HStack gap={3}>
                  <Box p={2} borderRadius="lg" bg="pink.500/20">
                    <Icon color="pink.400">
                      <WithdrawIcon />
                    </Icon>
                  </Box>
                  <Box>
                    <Heading size="md">Withdraw</Heading>
                    <Text color={textMuted} fontSize="sm" mt={1}>
                      Claim your funds privately
                    </Text>
                  </Box>
                </HStack>
              </Card.Header>

              <Card.Body pt={0}>
                <Stack gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                      Virtual Merkle Root
                    </Text>
                    <Input
                      value={vmr}
                      onChange={(e) => setVmr(e.target.value as `0x${string}`)}
                      fontFamily="mono"
                      fontSize="sm"
                      borderColor={vmr.length > 0 && !isHex32(vmr) ? "red.400" : borderCol}
                      placeholder="0x + 64 hex"
                      bg={isDarkMode ? "gray.900/50" : "white"}
                      _focus={{ borderColor: "pink.400", bg: isDarkMode ? "gray.900" : "white" }}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                      Nullifier
                    </Text>
                    <Input
                      value={nullifier}
                      onChange={(e) => setNullifier(e.target.value as `0x${string}`)}
                      fontFamily="mono"
                      fontSize="sm"
                      borderColor={
                        nullifier.length > 0 && !isHex32(nullifier) ? "red.400" : borderCol
                      }
                      placeholder="0x + 64 hex"
                      bg={isDarkMode ? "gray.900/50" : "white"}
                      _focus={{ borderColor: "pink.400", bg: isDarkMode ? "gray.900" : "white" }}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                      Recipient Address
                    </Text>
                    <Input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value as `0x${string}`)}
                      fontFamily="mono"
                      fontSize="sm"
                      placeholder="0x..."
                      bg={isDarkMode ? "gray.900/50" : "white"}
                      _focus={{ borderColor: "pink.400", bg: isDarkMode ? "gray.900" : "white" }}
                    />
                  </Box>

                  <HStack gap={3}>
                    <Button
                      onClick={onCheckpoint}
                      colorPalette="purple"
                      variant="outline"
                      size="md"
                      flex={1}
                      //isLoading={isWithdrawLoading}
                      _hover={{ bg: "purple.500/10" }}
                    >
                      Set Checkpoint
                    </Button>
                    <Button
                      onClick={onWithdraw}
                      colorPalette="pink"
                      size="md"
                      flex={1}
                      //isLoading={isWithdrawLoading}
                      _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                    >
                      Withdraw
                    </Button>
                  </HStack>

                  {statusWdr && (
                    <Box
                      p={3}
                      borderRadius="md"
                      bg={
                        statusWdr.includes("✅")
                          ? "green.500/10"
                          : statusWdr.includes("❌")
                            ? "red.500/10"
                            : "blue.500/10"
                      }
                      borderWidth="1px"
                      borderColor={
                        statusWdr.includes("✅")
                          ? "green.500/30"
                          : statusWdr.includes("❌")
                            ? "red.500/30"
                            : "blue.500/30"
                      }
                    >
                      <Text fontSize="xs" fontFamily="mono">
                        {statusWdr}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Card.Body>
            </Card.Root>
          </Grid>

          {/* Wallet Status Section */}
          <Box
            bg={cardBg}
            backdropFilter="blur(10px)"
            borderRadius="xl"
            borderWidth="1px"
            borderColor={borderCol}
            p={6}
          >
            <Heading size="sm" mb={4}>
              Wallet Connection
            </Heading>
            <Flex className={styles.content}>
              <Status />
              {isConnected && (
                <VStack w="full" gap={4} mt={4}>
                  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4} w="full">
                    <Address />
                    <Chain />
                    <Balance />
                    <BlockNumber />
                  </Grid>

                  <Separator />

                  <HStack gap={4} w="full" justifyContent="center">
                    <SignMessage />
                    <TransferNative />
                  </HStack>
                </VStack>
              )}
            </Flex>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default MainPane;
