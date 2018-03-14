#!/usr/bin/env node

const fs = require('fs');

const CONTRACT_NAMES_TO_COMBINE = process.argv.slice(2);
const BUILD_CONTRACTS_DIR = process.cwd() + '/build/contracts/';
const DESTINATION_DIR = process.cwd() + '/build/';

const contracts = {};
let contractIdsToCombine = [];

main();

function main() {
    loadContracts();
    contractIdsToCombine.forEach(toOneFile);
}

function loadContracts() {
    fs.readdirSync(BUILD_CONTRACTS_DIR).forEach(filename => {
        const contract = require(BUILD_CONTRACTS_DIR + filename);

        if (CONTRACT_NAMES_TO_COMBINE.indexOf(contract.contractName) !== -1) {
            contractIdsToCombine.push(contract.ast.id);
        }

        contracts[contract.ast.id] = contract;
    });
}

function toOneFile(contractId) {
    const contract = contracts[contractId];
    const dependencies = getContractDependencies(contractId)
        .filter((item, pos, array) => array.indexOf(item) === pos);
    dependencies.push(contractId);

    let sources = '';
    if (dependencies.length > 0) {
        sources += getSourcesWithoutImports(dependencies[0]);
        for (let i = 1; i < dependencies.length; i++) {
            sources += getSourcesWithoutImportsAndPragma(dependencies[i]);
        }
    }

    const destFilename = DESTINATION_DIR + contract.contractName + '.sol';
    fs.writeFileSync(destFilename, sources);
    console.info('Success, filename: ', destFilename);
}

function getContractDependencies(contractId) {
    const dependencies = [];
    const currentContractDependencies = contracts[contractId].ast.nodes
        .filter(c => c.nodeType === 'ImportDirective')
        .filter(c => {
            if (c.unitAlias !== "" || c.symbolAliases.length > 0) {
                throw Error(contracts[contractId].contractName + " contains aliases");
            }
            return c;
        })
        .map(c => c.sourceUnit);

    currentContractDependencies.forEach(id => dependencies.push(...getContractDependencies(id)));
    dependencies.push(...currentContractDependencies);

    return dependencies;
}

function getSourcesWithoutImports(contractId) {
    return contracts[contractId].source.replace(/(import.+?;\s+)+/, '');
}

function getSourcesWithoutImportsAndPragma(contractId) {
    return getSourcesWithoutImports(contractId).replace(/pragma .+?;/, '');
}