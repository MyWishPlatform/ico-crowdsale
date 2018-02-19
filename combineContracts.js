const fs = require('fs');

const BUILD_CONTRACTS_DIR = './build/contracts/';
const TOKEN_CONTRACT_ID = 1143;
const CROWDSALE_CONTRACT_ID = 1350;
const DESTINATION_DIR = './build/';

const contracts = {};
fs.readdirSync(BUILD_CONTRACTS_DIR).forEach(filename => {
    const contract = require(BUILD_CONTRACTS_DIR + filename);
    contracts[contract.ast.id] = contract;
});

main();

function main() {
    toOneFile(TOKEN_CONTRACT_ID);
    toOneFile(CROWDSALE_CONTRACT_ID);
}

function toOneFile(contractId) {
    const contract = contracts[contractId];
    const dependencies = getContractDependencies(contractId);
    let sources = getSourcesWithoutImports(contractId);
    dependencies.forEach(contractId => sources += getSourcesWithoutImportsAndPragma(contractId));
    fs.writeFileSync(DESTINATION_DIR + contract.contractName + '.sol', sources);
}

function getContractDependencies(contractId) {
    const dependencies = [];
    contracts[contractId].ast.children
        .filter(c => c.name === 'ImportDirective')
        .map(c => c.attributes.SourceUnit)
        .forEach(id => dependencies.push(id));

    dependencies.forEach(dep => dependencies.push(...getContractDependencies(dep)));
    return Array.from(new Set(dependencies));
}

function getSourcesWithoutImports(contractId) {
    return contracts[contractId].source.replace(/(import.+?;\s+)+/, '');
}

function getSourcesWithoutImportsAndPragma(contractId) {
    return getSourcesWithoutImports(contractId).replace(/pragma .+?;/, '');
}

