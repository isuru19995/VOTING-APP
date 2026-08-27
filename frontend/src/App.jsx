import { useCallback, useEffect, useState } from "react";
import { useVotingContract } from "./hooks/useVotingContract.js";
import { IS_DEPLOYED, DEPLOYMENT_NETWORK } from "./contracts/config.js";
import CreateElectionForm from "./components/CreateElectionForm.jsx";
import ElectionCard from "./components/ElectionCard.jsx";
import Dashboard from "./components/Dashboard.jsx";

const featureGuides = {
  voters: {
    title: "Registered voters",
    description: "Each election has its own voter registration. Share your public wallet address with the organiser, who can register it using the election card. Never share your private key or recovery phrase.",
  },
  activity: {
    title: "On-chain activity",
    description: "Open an election card and select ‘Show on-chain audit log’ to inspect voter registrations, votes and vote changes. Transaction links let you inspect the recorded activity. Voting transactions are public, not anonymous.",
  },
  results: {
    title: "Transparent results",
    description: "Each election card shows candidate totals and vote percentages. A changed vote moves your existing vote to another candidate rather than adding a second vote. Once the deadline passes, voting closes.",
  },
};

export default function App() {
  const { account, contract, chainId, error, connecting, hasMetaMask, connect } =
    useVotingContract();

  const [electionIds, setElectionIds] = useState([]);
  const [isOrganiser, setIsOrganiser] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [totalVotesAcrossAll, setTotalVotesAcrossAll] = useState(0);

  const refreshElections = useCallback(async () => {
    if (!contract) return;
    const count = Number(await contract.electionCount());
    setElectionIds(Array.from({ length: count }, (_, i) => i));

    let sum = 0;
    for (let i = 0; i < count; i++) {
      const [, , , , , totalVotesCast] = await contract.getElection(i);
      sum += Number(totalVotesCast);
    }
    setTotalVotesAcrossAll(sum);
  }, [contract]);

  useEffect(() => {
    refreshElections();
  }, [refreshElections]);

  useEffect(() => {
    async function checkOrganiser() {
      if (!contract || !account) return setIsOrganiser(false);
      const authorised = await contract.authorisedOrganisers(account);
      setIsOrganiser(authorised);
    }
    checkOrganiser();
  }, [contract, account]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <div className="brand"><span className="brand-mark" aria-hidden="true">✓</span><h1>Vote<span className="brand-accent">Space</span></h1></div>
          <p className="muted">
            DECENTRALIZED VOTING · DAS5003
          </p>
        </div>
        <div className="wallet-bar">
          {!IS_DEPLOYED && (
            <span className="notice">
              Contract not deployed yet — run a deploy script first.
            </span>
          )}
          {account ? (
            <span className="account-pill">
              {account.slice(0, 6)}…{account.slice(-4)}
              {chainId && <span className="muted small"> · chain {chainId}</span>}
            </span>
          ) : (
            <button onClick={connect} disabled={connecting || !hasMetaMask}>
              {connecting
                ? "Connecting…"
                : hasMetaMask
                ? "Connect MetaMask"
                : "MetaMask not found"}
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR VOICE. ON THE BLOCKCHAIN.</span>
          <h2>Make your choice.<br /><span>Make it count.</span></h2>
          <p>Create elections, cast your vote and explore transparent results. A shared space for decisions that everyone can verify.</p>
          <div className="hero-tags" aria-label="Voting feature guides">
            {Object.entries(featureGuides).map(([key, feature]) => (
              <button
                key={key}
                type="button"
                aria-expanded={activeFeature === key}
                aria-controls="feature-guide"
                onClick={() => setActiveFeature(activeFeature === key ? null : key)}
              >
                {feature.title}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-aside">
          <div className="ballot-symbol" aria-hidden="true">✓</div>
          <span className="network-label">{DEPLOYMENT_NETWORK} network</span>
          <strong>{account ? "Your wallet is connected" : "Your next decision starts here"}</strong>
          <p>{account ? "Explore elections below. Your wallet signs every voting transaction." : "Connect MetaMask to explore elections and participate with an approved address."}</p>
          <span className="test-note">Test-network demo · Votes are public</span>
        </div>
      </section>

      <section id="feature-guide" className="card feature-guide" hidden={!activeFeature} aria-live="polite">
        {activeFeature && (
          <>
            <div className="section-heading">
              <h2>{featureGuides[activeFeature].title}</h2>
              <button type="button" className="ghost small" onClick={() => setActiveFeature(null)}>Close guide</button>
            </div>
            <p>{featureGuides[activeFeature].description}</p>
            {contract ? (
              <a className="tx-link" href="#elections">Go to elections →</a>
            ) : (
              <p className="notice">{hasMetaMask ? "Connect MetaMask above to view election data." : "Open this app in a browser with MetaMask to view election data."}</p>
            )}
          </>
        )}
      </section>

      {error && <p className="error banner">{error}</p>}

      {contract && (
        <>
          <Dashboard electionCount={electionIds.length} totalVotesAcrossAll={totalVotesAcrossAll} />

          {isOrganiser && (
            <CreateElectionForm contract={contract} onCreated={refreshElections} />
          )}

          <section id="elections" className="elections-grid">
            <div className="section-heading"><div><span className="eyebrow">COMMUNITY DECISIONS</span><h2>Explore elections</h2></div><span className="count-label">{electionIds.length} elections</span></div>
            {electionIds.length === 0 && (
              <div className="empty-state"><h3>A fresh start for your community</h3><p>No elections yet. An authorised organiser can create the first one.</p></div>
            )}
            {electionIds
              .slice()
              .reverse()
              .map((id) => (
                <ElectionCard key={id} contract={contract} account={account} electionId={id} />
              ))}
          </section>
        </>
      )}

      {!contract && !error && (
        <p className="connection-hint">
          Connect your wallet to view elections{DEPLOYMENT_NETWORK !== "not-deployed-yet" &&
            ` on ${DEPLOYMENT_NETWORK}`}.
        </p>
      )}
      <footer className="app-footer"><span>VoteSpace / Blockchain Fundamentals</span><span>Sepolia demo · Never use real funds</span></footer>
    </div>
  );
}
