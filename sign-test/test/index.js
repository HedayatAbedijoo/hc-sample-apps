/// NB: The tryorama config patterns are still not quite stabilized.
/// See the tryorama README [https://github.com/holochain/tryorama]
/// for a potentially more accurate example

const path = require("path");

const {
  Orchestrator,
  Config,
  combine,
  singleConductor,
  localOnly,
  tapeExecutor
} = require("@holochain/tryorama");

process.on("unhandledRejection", error => {
  // Will print "unhandledRejection err is not defined"
  console.error("got unhandledRejection:", error);
});

const dnaPath = path.join(__dirname, "../dist/sign-test.dna.json");

const orchestrator = new Orchestrator({
  middleware: combine(
    // use the tape harness to run the tests, injects the tape API into each scenario
    // as the second argument
    tapeExecutor(require("tape")),

    // specify that all "players" in the test are on the local machine, rather than
    // on remote machines
    localOnly
  )
});
const dna_name = "signtest_dna";
const zome_name = "signtest";
const dna = Config.dna(dnaPath, dna_name);
const conductorConfig = Config.gen(
  { "signtest_dna": dna },
  {
    network: {
      type: "sim2h",
      sim2h_url: "ws://localhost:9000"
    },
    logger: Config.logger({ type: "error" }),
  }
);


async function show_entry(caller, address, title) {
  console.log("<<<<<<<<<<<<<<<  " + title + "  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  const result =
    await caller.call(dna_name, zome_name, "get_entry", {
      address: address

    });

  //console.log(title);
  console.log(result);
  console.log("<End>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
}

async function call_function(caller, fn_name, title) {
  console.log("<<<<<<<<<<<<<<<  " + title + "  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  const result =
    await caller.call(dna_name, zome_name, fn_name, {
    });

  //console.log(title);
  console.log(result);
  console.log("<End>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
}

orchestrator.registerScenario("Scenario1", async (s, t) => {
  const { alice, bob } = await s.players(
    { alice: conductorConfig, bob: conductorConfig },
    true
  );


  await call_function(alice, "get_agent_address", "Agent-address-Alice");
  await call_function(bob, "get_agent_address", "Agent-address-Bob");

  const pub_adrr = await alice.call(
    dna_name,
    zome_name,
    "create",
    {
      title: "First entry"
    }
  );
  t.ok(pub_adrr.Ok);
  await s.consistency();

  await show_entry(alice, pub_adrr.Ok, "Alice_First Entry Created");
  await s.consistency();

  //// Alice signed the entry?
  const alive_did_sign = await alice.call(
    dna_name,
    zome_name,
    "is_public_entry_signed_by_me",
    {
      entry_address: pub_adrr.Ok,
    }
  );
  console.log(alive_did_sign);
  t.true(alive_did_sign.Ok == true); // he created the entry so it should be true

  await s.consistency();


  //// Bob signed the entry?
  const bob_did_sign = await bob.call(
    dna_name,
    zome_name,
    "is_public_entry_signed_by_me",
    {
      entry_address: pub_adrr.Ok,
    }
  );
  console.log(bob_did_sign);
  t.true(bob_did_sign.Ok == false); // it should be false because he did not sign the entry  ::: TODO: Error

  await s.consistency();

});


orchestrator.run();
