import React from 'react';
import isEqual from 'lodash.isequal';

import AppsIcon from './logo.svg';
import ReportProblem from 'material-ui/svg-icons/action/report-problem';
import SettingsIcon from 'material-ui/svg-icons/action/settings';

import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
const muiTheme = getMuiTheme({});

import TransactionConfirmation from '../TransactionConfirmation';
import AccountChooser from '../AccountsChooser';
import Web3Component from '../Web3Component';
import AccountsDetails from '../AccountsDetails';
import SubdomainDialog from '../SubdomainDialog';
import CreateAccount from '../CreateAccount';
import StatusLine from '../StatusLine';
import DappNav from '../DappNav';

import Storage from '../Storage';
import {appLink} from '../appLink';

import styles from './TopBar.css';

export default class TopBar extends Web3Component {

  // IE9 - contextTypes are not inherited
  static contextTypes = Web3Component.contextTypes;

  static propTypes = {
    interceptor: React.PropTypes.object.isRequired,
    web3: React.PropTypes.object.isRequired,
    options: React.PropTypes.shape({
      allAccounts: React.PropTypes.bool.isRequired
    }).isRequired
  }

  storage = Storage.crossOrigin();

  state = {
    waiting: 0,
    accounts: [],
    allAccounts: [],
    accountsNames: {},
    sendingTransaction: false,
    createAccountOpen: false,
    accountsDetails: false,
    isSignerEnabled: false
  };

  listeners = [];

  componentWillMount () {
    this.storageListener = this.storage.onAccountsNames((accountsNames) => {
      if (isEqual(this.state.accountsNames, accountsNames)) {
        return;
      }

      this.fixAccountNames(accountsNames, this.state.allAccounts);
    });

    this.listeners = [
      this.props.interceptor.intercept('eth_accounts', this.onEthAccounts),
      this.props.interceptor.intercept('eth_sendTransaction', this.onEthSendTransaction)
    ];
  }

  componentWillUnmount () {
    super.componentWillUnmount();
    this.storageListener();
    this.listeners.map((off) => off());
  }

  render () {
    // Because dom might not be ready yet
    // we are deferring component load.
    // (We want to load component anyway for
    //  Interceptor logic to kick in)
    if (!document.body) {
      setTimeout(() => {
        this.setState({
          waiting: this.state.waiting + 1
        });
      }, 5);
      return (
        <div className={styles.topbar}>
            <h4 className={styles.header}>Loading...</h4>
        </div>
      );
    }

    const { allAccounts, accountsNames, accountsDetails, createAccountOpen } = this.state;

    return (
      <MuiThemeProvider muiTheme={muiTheme}>
        <div>
          <div className={styles.topbar}>
            <div className={styles.header}>
              <a
                href={appLink('home')}
                onClick={this.forceNavigation}
                title='Home @ Parity'
                >
                <img src={AppsIcon} className={styles.dapps} />
              </a>
              <div className={styles.dialog}>
                <SubdomainDialog>
                  <ReportProblem />
                </SubdomainDialog>
              </div>
              <DappNav onSearchActive={this.onSearchActive}/>
              <div className={this.state.searchActive ? styles.statusHidden : styles.statusVisible }>
                <StatusLine />
              </div>
            </div>
            {this.renderManageAccounts()}
          </div>
          <AccountsDetails
            open={accountsDetails}
            accounts={allAccounts}
            onOpenCreateAccount={this.onOpenCreateAccount}
            accountsNames={accountsNames}
            onClose={this.onAccountsDetailsClose}
            />
          <CreateAccount
            open={createAccountOpen}
            accounts={allAccounts}
            onClose={this.closeCreateAccount}
          />
          <TransactionConfirmation
            open={this.state.sendingTransaction}
            transaction={this.state.transaction}
            onAbort={this.abortTransaction}
            onConfirm={this.confirmTransaction}
          />
        </div>
      </MuiThemeProvider>
    );
  }

  renderUnconfirmedTransactions () {
    const { isSignerEnabled } = this.state;

    if (!isSignerEnabled) {
      return;
    }

    const port = isSignerEnabled === true ? 8180 : isSignerEnabled;

    return (
      <iframe
        className={styles.unconfirmedTx}
        src={`http://127.0.0.1:${port}/count.html`}
        seamless
      />
    );
  }

  renderManageAccounts () {
    const { allAccounts, accountsNames } = this.state;

    if (!allAccounts.length) {
      return (
        <a onClick={this.onOpenCreateAccount} className={styles.createAccount}>
          Create account
        </a>
      );
    }

    return (
      <div className={styles.nowrap}>
        <AccountChooser
          accounts={allAccounts}
          accountsNames={accountsNames}
          onChange={this.changeAccount}
        />
        <a
          className={styles.settings}
          href='javascript:void(0)'
          onClick={this.onOpenAccountDetails}
          >
          <SettingsIcon />
        </a>
        {this.renderUnconfirmedTransactions()}
      </div>
    );
  }

  fixAccountNames (names, accounts) {
    const copy = Object.assign({}, names);
    const accountsNames = accounts.reduce((memo, acc, idx) => {
      memo[acc] = names[acc] || `Account ${idx + 1}`;
      return memo;
    }, copy);
    this.setState({ accountsNames });
  }

  onTick (next) {
    this.context.web3.personal.signerEnabled((err, isSignerEnabled) => {
      if (err) {
        return;
      }

      this.setState({ isSignerEnabled });
    });
    this.context.web3.eth.getAccounts((err, allAccounts) => {
      this.handleFirstRun(allAccounts);
      if (err) {
        next(10);
        return console.error(err);
      }

      if (isEqual(allAccounts, this.state.allAccounts)) {
        return next(10);
      }

      this.fixAccountNames(this.state.accountsNames, allAccounts);
      this.setState({allAccounts});
      next();
    });
  }

  onSearchActive = (active) => {
    this.setState({
      searchActive: active
    });
  }

  onEthAccounts = (payload, cb, next) => {
    if (this.props.options.allAccounts) {
      return next();
    }

    const response = {
      jsonrpc: payload.jsonrpc,
      id: payload.id,
      result: this.state.accounts
    };

    if (cb) {
      return cb(null, response);
    }

    return response;
  }

  onEthSendTransaction = (payload, cb, next) => {
    // Don't intercept sendTransaction if we are running with signer module.
    if (this.state.isSignerEnabled) {
      return next();
    }

    if (!cb) {
      throw new Error('Synchronous sendTransaction is not supported.');
    }

    this.setState({
      sendingTransaction: true,
      transaction: payload,
      callbackFunc: cb
    });
  }

  clearTx = () => {
    this.setState({
      sendingTransaction: false,
      transaction: null,
      callbackFunc: null
    });
  }

  abortTransaction = () => {
    this.state.callbackFunc('aborted');
    this.clearTx();
  }

  confirmTransaction = (err, data) => {
    this.state.callbackFunc(err, data);
    this.clearTx();
  }

  changeAccount = (account) => {
    this.setState({
      accounts: [account]
    });
    // set default account
    this.props.web3.defaultAccount = account;
    this.props.web3.eth.defaultAccount = account;
    this.props.web3.settings.defaultAccount = account;
    this.context.web3.defaultAccount = account;
    this.context.web3.eth.defaultAccount = account;
    this.context.web3.settings.defaultAccount = account;
  }

  onOpenAccountDetails = () => {
    this.setState({
      accountsDetails: true
    });
  }

  onAccountsDetailsClose = (names) => {
    this.setState({
      accountsDetails: false,
      accountsNames: names
    });
    this.storage.setAccountsNames(names);
  }

  closeCreateAccount = () => {
    this.setState({ createAccountOpen: false });
  }

  onOpenCreateAccount = () => {
    this.setState({ createAccountOpen: true });
  }

  forceNavigation = () => {
    window.location.reload(true);
  }

  handleFirstRun = (allAccounts) => {
    this.handleFirstRun = () => {}; // change to noop after first tick
    this.storage.getNotFirstRun(notFirstRun => {
      if (notFirstRun) {
        return;
      }
      this.storage.saveNotFirstRun();
      if (allAccounts.length) {
        return;
      }
      this.onOpenCreateAccount();
    });
  }

}
