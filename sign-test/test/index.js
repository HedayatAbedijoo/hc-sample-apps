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



async function _call(caller, fnName, params, logTest) {
  console.log("<<<<<<<<<<<<<<<  " + logTest + "  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  const result = await caller.call(
    dna_name,
    zome_name,
    fnName,
    params
  );
  return result;
  console.log("<End>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
}

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
  console.log("<End>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  console.log(result);
}
function _logstart(title) {
  console.log("<<<<<<<<<<<<<<<  " + title + "  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
}
function _logend() {
  console.log("<End>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
}
orchestrator.registerScenario("Scenario1", async (s, t) => {
  const { alice, bob } = await s.players(
    { alice: conductorConfig, bob: conductorConfig },
    true
  );

  await call_function(alice, "get_agent_address", "Agent-address-Alice");
  await call_function(bob, "get_agent_address", "Agent-address-Bob");
  const pub_adrr = await _call(alice, "create", { title: "First entry" }, "Alice Create Etnry")
  console.log(pub_adrr.Ok);

  await _call(alice, "get_provinence", { entry_address: pub_adrr.Ok }, "Alice Provinenece");
  await _call(bob, "get_provinence", { entry_address: pub_adrr.Ok }, "Bob Provinenece");

  await show_entry(alice, { entry_address: pub_adrr.Ok }, "Alice getting entry");
  await show_entry(bob, { entry_address: pub_adrr.Ok }, "Bob getting entry");

  const alice_signed = await _call(alice, "is_signed_by_me", { entry_address: pub_adrr.Ok }, "Alice signed the entry?");
  t.true(alice_signed.Ok == true); // Yes because he is the creator of entry
  const bob_signed = await _call(bob, "is_signed_by_me", { entry_address: pub_adrr.Ok }, "Bob signed the entry?");
  t.true(bob_signed.Ok == false);

  await _call(bob, "sign_entry", { entry_address: pub_adrr.Ok }, "Bob wants to sign the etnry");

  const recheck_bob_signed = await _call(bob, "is_signed_by_me", { entry_address: pub_adrr.Ok }, "Bob signed the entry?");
  t.true(bob_signed.Ok == true);

});


orchestrator.run();
