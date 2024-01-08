// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import http from "http";

const {
    TunnelConnectionMode,
    TunnelProtocol,
    TunnelRelayTunnelEndpoint,
    TunnelPort,
    Tunnel,
    TunnelAccessScopes,
    TunnelProgress,
} = require('@microsoft/dev-tunnels-contracts');
const {TunnelManagementClient} = require('@microsoft/dev-tunnels-management');
const {
    SshChannelOpeningEventArgs,
    SshChannelOpenFailureReason,
    SshStream,
    SshSessionClosedEventArgs,
    SshDisconnectReason,
    KeyPair,
    TraceLevel,
    SshServerSession,
    SshAuthenticatingEventArgs,
    NodeStream,
    SshAuthenticationType,
    PromiseCompletionSource,
    CancellationError,
    Trace,
    SshChannel,
    Stream,
    SessionRequestMessage,
    SshRequestEventArgs,
    SessionRequestSuccessMessage,
    SshClientSession,
    SshSessionConfiguration,
    SshAlgorithms,
    SshSession,
    SshServerCredentials,
    SecureStream,
    SshProtocolExtensionNames,
    SshConnectionError,
} = require('@microsoft/dev-tunnels-ssh');
const {
    ForwardedPortConnectingEventArgs,
    PortForwardChannelOpenMessage,
    PortForwardingService,
    RemotePortForwarder,
} = require('@microsoft/dev-tunnels-ssh-tcp');
const {CancellationToken} = require('vscode-jsonrpc');
const {SshHelpers} = require('@microsoft/dev-tunnels-connections/sshHelpers');
const {MultiModeTunnelHost} = require('@microsoft/dev-tunnels-connections/multiModeTunnelHost');
const {SessionPortKey} = require('@microsoft/dev-tunnels-connections/sessionPortKey');
const {
    PortRelayConnectRequestMessage
} = require('@microsoft/dev-tunnels-connections/messages/portRelayConnectRequestMessage');
const {
    PortRelayConnectResponseMessage
} = require('@microsoft/dev-tunnels-connections/messages/portRelayConnectResponseMessage');
const uuidv4 = require('uuid').v4;

const {TunnelHost} = require('@microsoft/dev-tunnels-connections/tunnelHost');
const {isNode} = require('@microsoft/dev-tunnels-connections/sshHelpers');
const {TunnelConnectionSession} = require('@microsoft/dev-tunnels-connections/tunnelConnectionSession');

const webSocketSubProtocol = 'tunnel-relay-host';
const webSocketSubProtocolv2 = 'tunnel-relay-host-v2-dev';

// Check for an environment variable to determine which protocol version to use.
// By default, prefer V2 and fall back to V1.
const protocolVersion = process?.env && process.env.DEVTUNNELS_PROTOCOL_VERSION;
const connectionProtocols =
    protocolVersion === '1' ? [webSocketSubProtocol] :
        protocolVersion === '2' ? [webSocketSubProtocolv2] :
            [webSocketSubProtocolv2, webSocketSubProtocol];

declare class TunnelConnectionBase  {
    /**
     * Gets tunnel access scope for this tunnel session.
     */
    readonly tunnelAccessScope: string;
    private readonly disposeCts;
    private status;
    private error?;
    private readonly refreshingTunnelAccessTokenEmitter;
    private readonly connectionStatusChangedEmitter;
    private readonly retryingTunnelConnectionEmitter;
    private readonly forwardedPortConnectingEmitter;
    protected constructor(
        /**
         * Gets tunnel access scope for this tunnel session.
         */
        tunnelAccessScope: string);
    /**
     * Gets a value indicathing that this tunnel connection session is disposed.
     */
    get isDisposed(): boolean;
    protected get isRefreshingTunnelAccessTokenEventHandled(): boolean;
    /**
     * Gets dispose cancellation token.
     */
    protected get disposeToken(): any;
    /**
     * Gets the connection status.
     */
    protected get connectionStatus(): any;
    /**
     * Sets the connection status.
     * Throws CancellationError if the session is disposed and the status being set is not ConnectionStatus.Disconnected.
     */
    protected set connectionStatus(value: any);
    /**
     * Gets the error that caused disconnection.
     * Undefined if not yet connected or disconnection was caused by disposing of this object.
     */
    protected get disconnectError(): Error | undefined;
    /**
     * Sets the error that caused disconnection.
     */
    protected set disconnectError(e: Error | undefined);
    /**
     * Event for refreshing the tunnel access token.
     * The tunnel client will fire this event when it is not able to use the access token it got from the tunnel.
     */
    readonly refreshingTunnelAccessToken: any;
    /**
     * Connection status changed event.
     */
    readonly connectionStatusChanged: any;
    /**
     * Event raised when a tunnel connection attempt failed and is about to be retried.
     *  An event handler can cancel the retry by setting {@link RetryingTunnelConnectionEventArgs.retry} to false.
     */
    readonly retryingTunnelConnection: any;
    /**
     * An event which fires when a connection is made to the forwarded port.
     */
    readonly forwardedPortConnecting: any;
    protected onForwardedPortConnecting(e: any): void;
    /**
     * Closes and disposes the tunnel session.
     */
    dispose(): Promise<void>;
    /**
     *  Notifies about a connection retry, giving the relay client a chance to delay or cancel it.
     */
    onRetrying(event: any): void;
    /**
     * Gets the fresh tunnel access token or undefined if it cannot.
     */
    protected getFreshTunnelAccessToken(cancellation: any): Promise<string | null | undefined>;
    /**
     * Event fired when the connection status has changed.
     */
    protected onConnectionStatusChanged(previousStatus: any, status: any): void;
    /**
     * Throws CancellationError if the tunnel connection is disposed.
     */
    protected throwIfDisposed(): void;
}
declare class TunnelConnectionSession extends TunnelConnectionBase  {
    protected readonly connectionProtocols: string[];
    /**
     * Gets the management client used for the connection.
     */
    protected readonly managementClient?: any | undefined;
    private connectionOptions?;
    private connectedTunnel;
    private connector?;
    private reconnectPromise?;
    private connectionProtocolValue?;
    private disconnectionReason?;
    private readonly refreshingTunnelEmitter;
    private readonly reportProgressEmitter;
    /**
     * Event that is raised to report connection progress.
     *
     * See `Progress` for a description of the different progress events that can be reported.
     */
    readonly onReportProgress: Event;
    httpAgent?: http.Agent;
    /**
     * Gets or sets a factory for creating relay streams.
     */
    streamFactory: any;
    /**
     * Name of the protocol used to connect to the tunnel.
     */
    protected get connectionProtocol(): string | undefined;
    protected set connectionProtocol(value: string | undefined);

    protected raiseReportProgress(progress: any, sessionNumber?: number): void;
    /**
     * A value indicating if this is a client tunnel connection (as opposed to host connection).
     */
    protected get isClientConnection(): boolean;
    /**
     * tunnel connection role, either "client", or "host", depending on @link tunnelAccessScope.
     */
    protected get connectionRole(): string;
    /**
     * Tunnel access token.
     */
    protected accessToken?: string;
    protected sshSessionDisposables: any[];
    constructor(tunnelAccessScope: string, connectionProtocols: string[], trace?: any,
                /**
                 * Gets the management client used for the connection.
                 */
                managementClient?: any | undefined);
    /**
     * Gets the trace source.
     */
    trace: any;
    /**
     * Get the tunnel of this tunnel connection.
     */
    protected tunnel;
    protected relayUri;
    /**
     * An event which fires when tunnel connection refreshes tunnel.
     */
    readonly refreshingTunnel: Event;
    /**
     * Tunnel has been assigned to or changed.
     */
    protected tunnelChanged(): void;
    /**
     * Determines whether E2E encryption is requested when opening connections through the tunnel
     * (V2 protocol only).
     *
     * The default value is true, but applications may set this to false (for slightly faster
     * connections).
     *
     * Note when this is true, E2E encryption is not strictly required. The tunnel relay and
     * tunnel host can decide whether or not to enable E2E encryption for each connection,
     * depending on policies and capabilities. Applications can verify the status of E2EE by
     * handling the `forwardedPortConnecting` event and checking the related property on the
     * channel request or response message.
     */
    enableE2EEncryption: boolean;
    /**
     * Gets a value indicating that this connection has already created its connector
     * and so can be reconnected if needed.
     */
    protected get isReconnectable(): boolean;
    /**
     * Gets the disconnection reason.
     * {@link SshDisconnectReason.none } if not yet disconnected.
     * {@link SshDisconnectReason.connectionLost} if network connection was lost and reconnects are not enabled or unsuccesfull.
     * {@link SshDisconnectReason.byApplication} if connection was disposed.
     * {@link SshDisconnectReason.tooManyConnections} if host connection was disconnected because another host connected for the same tunnel.
     */
    protected get disconnectReason(): any | undefined;
    /**
     * Sets the disconnect reason that caused disconnection.
     */
    protected set disconnectReason(reason: any | undefined);
    /**
     * Disposes this tunnel session, closing the SSH session used for it.
     */
    dispose(): Promise<void>;
    /**
     * Get a value indicating whether this session can attempt refreshing tunnel.
     * Note: tunnel refresh may still fail if the tunnel doesn't exist in the service,
     * tunnel access has changed, or tunnel access token has expired.
     */
    protected get canRefreshTunnel(): boolean | any;
    /**
     * Fetch the tunnel from the service if {@link managementClient} and {@link tunnel} are set.
     */
    protected refreshTunnel(includePorts?: boolean, cancellation?: any): Promise<boolean>;
    /**
     * Creates a tunnel connector
     */
    protected createTunnelConnector(): any;
    /**
     * Trace info message.
     */
    protected traceInfo(msg: string): void;
    /**
     * Trace verbose message.
     */
    protected traceVerbose(msg: string): void;
    /**
     * Trace warning message.
     */
    protected traceWarning(msg: string, err?: Error): void;
    /**
     * Trace error message.
     */
    protected traceError(msg: string, err?: Error): void;
    /**
     * SSH session closed event handler. Child classes may use it unsubscribe session events and maybe start reconnecting.
     */
    protected onSshSessionClosed(e: any): void;
    /**
     * Start reconnecting if the tunnel connection is not yet disposed.
     */
    protected maybeStartReconnecting(reason?: any, message?: string, error?: Error | null): void;
    /**
     * Get a user-readable reason for SSH session disconnection, or an empty string.
     */
    protected getDisconnectReason(reason?: any, message?: string, error?: Error | null): string;
    /**
     * Connect to the tunnel session by running the provided {@link action}.
     */
    connectSession(action: () => Promise<void>): Promise<void>;
    /**
     * Connect to the tunnel session with the tunnel connector.
     * @param tunnel Tunnel to use for the connection.
     *     Undefined if the connection information is already known and the tunnel is not needed.
     *     Tunnel object to get the connection information from that tunnel.
     */
    connectTunnelSession(tunnel?: any, options?: any, cancellation?: any): Promise<void>;
    /**
     * Validate the {@link tunnel} and get data needed to connect to it, if the tunnel is provided;
     * otherwise, ensure that there is already sufficient data to connect to a tunnel.
     */
    onConnectingToTunnel(): Promise<void>;
    /**
     * Validates tunnel access token if it's present. Returns the token.
     */
    validateAccessToken(): string | undefined;
    /**
     * Unsubscribe SSH session events in @link TunnelSshConnectionSession.sshSessionDisposables
     */
    protected unsubscribeSessionEvents(): void;
}
/**
 * Tunnel host implementation that uses data-plane relay
 *  to accept client connections.
 */
export class TunnelRelayTunnelHost extends TunnelConnectionSession {
    public static readonly webSocketSubProtocol = webSocketSubProtocol;
    public static readonly webSocketSubProtocolv2 = webSocketSubProtocolv2;

    /**
     * Ssh channel type in host relay ssh session where client session streams are passed.
     */
    public static clientStreamChannelType: string = 'client-ssh-session-stream';

    private readonly id: string;
    private readonly hostId: string;
    private readonly clientSessionPromises: Promise<void>[] = [];
    private readonly reconnectableSessions: any[] = [];

    /**
     * Sessions created between this host and clients
     * @internal
     */
    public readonly sshSessions: any[] = [];
    protected sshSession;
    /**
     * Port Forwarders between host and clients
     */
    public readonly remoteForwarders = new Map<string, any>();

    /**
     * Private key used for connections.
     */
    public hostPrivateKey?: any;

    /**
     * Public keys used for connections.
     */
    public hostPublicKeys?: string[];

    /**
     * Promise task to get private key used for connections.
     */
    public hostPrivateKeyPromise?: Promise<any>;

    private loopbackIp = '127.0.0.1';

    private forwardConnectionsToLocalPortsValue: boolean = isNode();

    /**
     * Synthetic endpoint signature of the endpoint created when host connects.
     * undefined if the endpoint has not been created yet.
     */
    private endpointSignature?: string;

    public constructor(managementClient: any, trace?: any) {
        super(TunnelAccessScopes.Host, connectionProtocols, trace, managementClient);
        const publicKey = SshAlgorithms.publicKey.ecdsaSha2Nistp384!;
        if (publicKey) {
            this.hostPrivateKeyPromise = publicKey.generateKeyPair();
        }

        this.hostId = MultiModeTunnelHost.hostId;
        this.id = uuidv4() + "-relay";
    }

    /**
     * A value indicating whether the port-forwarding service forwards connections to local TCP sockets.
     * Forwarded connections are not possible if the host is not NodeJS (e.g. browser).
     * The default value for NodeJS hosts is true.
     */
    public get forwardConnectionsToLocalPorts(): boolean {
        return this.forwardConnectionsToLocalPortsValue;
    }

    public set forwardConnectionsToLocalPorts(value: boolean) {
        if (value === this.forwardConnectionsToLocalPortsValue) {
            return;
        }

        if (value && !isNode()) {
            throw new Error('Cannot forward connections to local TCP sockets on this platform.');
        }

        this.forwardConnectionsToLocalPortsValue = value;
    }

    /**
     * Connects to a tunnel as a host and starts accepting incoming connections
     * to local ports as defined on the tunnel.
     * @deprecated Use `connect()` instead.
     */
    public async start(tunnel: any): Promise<void> {
        await this.connect(tunnel);
    }

    /**
     * Connects to a tunnel as a host and starts accepting incoming connections
     * to local ports as defined on the tunnel.
     */
    public async connect(
        tunnel: any,
        options?: any,
        cancellation?: any,
    ): Promise<void> {
        await this.connectTunnelSession(tunnel, options, cancellation);
    }

    /**
     * Connect to the tunnel session with the tunnel connector.
     * @param tunnel Tunnel to use for the connection.
     *     Undefined if the connection information is already known and the tunnel is not needed.
     *     Tunnel object to get the connection information from that tunnel.
     */
    public async connectTunnelSession(
        tunnel?: any,
        options?: any,
        cancellation?: any
    ): Promise<void> {
        if (this.disconnectReason === SshDisconnectReason.tooManyConnections) {
            // If another host for the same tunnel connects, the first connection is disconnected
            // with "too many connections" reason. Reconnecting it again would cause the second host to
            // be kicked out, and then it would try to reconnect, kicking out this one.
            // To prevent this tug of war, do not allow reconnection in this case.
            throw new SshConnectionError(
                'Cannot retry connection because another host for this tunnel has connected. ' +
                'Only one host connection at a time is supported.',
                SshDisconnectReason.tooManyConnections);
        }

        await super.connectTunnelSession(tunnel, options, cancellation);
    }

    /**
     * Configures the tunnel session with the given stream.
     * @internal
     */
    public async configureSession(
        stream: any,
        protocol: string,
        isReconnect: boolean,
        cancellation: any,
    ): Promise<void> {
        this.connectionProtocol = protocol;
        let session: any;
        if (this.connectionProtocol === webSocketSubProtocol) {
            // The V1 protocol always configures no security, equivalent to SSH MultiChannelStream.
            // The websocket transport is still encrypted and authenticated.
            session = new SshClientSession(
                new SshSessionConfiguration(false)); // no encryption
        } else {
            session = SshHelpers.createSshClientSession((config) => {
                // The V2 protocol configures optional encryption, including "none" as an enabled
                // and preferred key-exchange algorithm, because encryption of the outer SSH
                // session is optional since it is already over a TLS websocket.
                config.keyExchangeAlgorithms.splice(0, 0, SshAlgorithms.keyExchange.none);

                config.addService(PortForwardingService);
            });

            const hostPfs = session.activateService(PortForwardingService);
            hostPfs.messageFactory = this;
            hostPfs.onForwardedPortConnecting(this.onForwardedPortConnecting, this, this.sshSessionDisposables);
        }

        session.onChannelOpening(this.hostSession_ChannelOpening, this, this.sshSessionDisposables);
        session.onClosed(this.onSshSessionClosed, this, this.sshSessionDisposables);

        session.trace = this.trace;
        session.onReportProgress(
            (args) => this.raiseReportProgress(args.progress, args.sessionNumber),
            this,
            this.sshSessionDisposables);
        this.sshSession = session;
        await session.connect(stream, cancellation);

        // SSH authentication is skipped in V1 protocol, optional in V2 depending on whether the
        // session performed a key exchange (as indicated by having a session ID or not). In the
        // latter case a password is not required. Strong authentication was already handled by
        // the relay service via the tunnel access token used for the websocket connection.
        if (session.sessionId) {
            await session.authenticate({username: 'tunnel'});
        }

        if (this.connectionProtocol === webSocketSubProtocolv2) {
            // In the v2 protocol, the host starts "forwarding" the ports as soon as it connects.
            // Then the relay will forward the forwarded ports to clients as they connect.
            await this.startForwardingExistingPorts(session);
        }
    }

    /**
     * Validate the {@link tunnel} and get data needed to connect to it, if the tunnel is provided;
     * otherwise, ensure that there is already sufficient data to connect to a tunnel.
     * @internal
     */
    public async onConnectingToTunnel(): Promise<void> {
        if (!this.hostPrivateKey || !this.hostPublicKeys) {
            if (!this.hostPrivateKeyPromise) {
                throw new Error('Cannot create host keys');
            }
            this.hostPrivateKey = await this.hostPrivateKeyPromise;
            const buffer = await this.hostPrivateKey.getPublicKeyBytes(
                this.hostPrivateKey.keyAlgorithmName,
            );
            if (!buffer) {
                throw new Error('Host private key public key bytes is not initialized');
            }
            this.hostPublicKeys = [buffer.toString('base64')];
        }

        const tunnelHasSshPort = this.tunnel?.ports != null && this.tunnel.ports.find((v) => v.protocol === TunnelProtocol.Ssh);
        const endpointSignature =
            `${this.tunnel?.tunnelId}.${this.tunnel?.clusterId}:` +
            `${this.tunnel?.name}.${this.tunnel?.domain}:` +
            `${tunnelHasSshPort}:${this.hostId}:${this.hostPublicKeys}`;

        if (!this.relayUri || this.endpointSignature !== endpointSignature) {
            if (!this.tunnel) {
                throw new Error('Tunnel is required');
            }

            let endpoint: any = {
                id: this.id,
                hostId: this.hostId,
                hostPublicKeys: this.hostPublicKeys,
                connectionMode: TunnelConnectionMode.TunnelRelay,
            };

            let additionalQueryParameters = undefined;
            if (tunnelHasSshPort) {
                additionalQueryParameters = {includeSshGatewayPublicKey: 'true'};
            }

            endpoint = await this.managementClient!.updateTunnelEndpoint(this.tunnel, endpoint, {
                additionalQueryParameters: additionalQueryParameters,
            });

            this.relayUri = endpoint.hostRelayUri!;
            this.endpointSignature = endpointSignature;
        }
    }

    /**
     * Disposes this tunnel session, closing all client connections, the host SSH session, and deleting the endpoint.
     */
    public async dispose(): Promise<void> {
        await super.dispose();

        const promises: Promise<any>[] = Object.assign([], this.clientSessionPromises);

        // No new client session should be added because the channel requests are rejected when the tunnel host is disposed.
        this.clientSessionPromises.length = 0;

        // If the tunnel is present, the endpoint was created, and this host was not closed because of
        // too many connections, delete the endpoint.
        // Too many connections closure means another host has connected, and that other host, while
        // connecting, would have updated the endpoint. So this host won't be able to delete it anyway.
        if (this.tunnel &&
            this.endpointSignature &&
            this.disconnectReason !== SshDisconnectReason.tooManyConnections) {
            const promise = this.managementClient!.deleteTunnelEndpoints(
                this.tunnel,
                this.id,
            );
            promises.push(promise);
        }

        for (const forwarder of this.remoteForwarders.values()) {
            forwarder.dispose();
        }

        // When client session promises finish, they remove the sessions from this.sshSessions
        await Promise.all(promises);
    }

    private hostSession_ChannelOpening(e: any) {
        if (!e.isRemoteRequest) {
            // Auto approve all local requests (not that there are any for the time being).
            return;
        }

        if (this.connectionProtocol === webSocketSubProtocolv2 &&
            e.channel.channelType === 'forwarded-tcpip'
        ) {
            // With V2 protocol, the relay server always sends an extended channel open message
            // with a property indicating whether E2E encryption is requested for the connection.
            // The host returns an extended response message indicating if E2EE is enabled.
            const relayRequestMessage = e.channel.openMessage
                .convertTo(new PortRelayConnectRequestMessage());
            const responseMessage = new PortRelayConnectResponseMessage();

            // The host can enable encryption for the channel if the client requested it.
            responseMessage.isE2EEncryptionEnabled = this.enableE2EEncryption &&
                relayRequestMessage.isE2EEncryptionRequested;

            // In the future the relay might send additional information in the connect
            // request message, for example a user identifier that would enable the host to
            // group channels by user.

            e.openingPromise = Promise.resolve(responseMessage);
            return;
        } else if (e.channel.channelType !== TunnelRelayTunnelHost.clientStreamChannelType) {
            e.failureDescription = `Unknown channel type: ${e.channel.channelType}`;
            e.failureReason = SshChannelOpenFailureReason.unknownChannelType;
            return;
        }

        // V1 protocol.

        // Increase max window size to work around channel congestion bug.
        // This does not entirely eliminate the problem, but reduces the chance.
        e.channel.maxWindowSize = SshChannel.defaultMaxWindowSize * 5;

        if (this.isDisposed) {
            e.failureDescription = 'The host is disconnecting.';
            e.failureReason = SshChannelOpenFailureReason.connectFailed;
            return;
        }

        const promise = this.acceptClientSession(e.channel, this.disposeToken);
        this.clientSessionPromises.push(promise);

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        promise.then(() => {
            const index = this.clientSessionPromises.indexOf(promise);
            this.clientSessionPromises.splice(index, 1);
        });
    }

    protected onForwardedPortConnecting(e: any): void {
        const channel = e.stream.channel;
        const relayRequestMessage = channel.openMessage.convertTo(
            new PortRelayConnectRequestMessage());

        const isE2EEncryptionEnabled = this.enableE2EEncryption &&
            relayRequestMessage.isE2EEncryptionRequested;
        if (isE2EEncryptionEnabled) {
            // Increase the max window size so that it is at least larger than the window
            // size of one client channel.
            channel.maxWindowSize = SshChannel.defaultMaxWindowSize * 2;

            const serverCredentials: any = {
                publicKeys: [this.hostPrivateKey!]
            };
            const secureStream = new SecureStream(
                e.stream,
                serverCredentials,
                this.reconnectableSessions);
            secureStream.trace = this.trace;

            // The client was already authenticated by the relay.
            secureStream.onAuthenticating((authEvent) =>
                authEvent.authenticationPromise = Promise.resolve({}));

            // The client will connect to the secure stream after the channel is opened.
            secureStream.connect().catch((err) => {
                this.trace(TraceLevel.Error, 0, `Error connecting encrypted channel: ${err}`);
            });

            e.transformPromise = Promise.resolve(secureStream);
        }

        super.onForwardedPortConnecting(e);
    }

    private async acceptClientSession(
        clientSessionChannel: any,
        cancellation: any,
    ): Promise<void> {
        try {
            const stream = new SshStream(clientSessionChannel);
            await this.connectAndRunClientSession(stream, cancellation);
        } catch (ex) {
            if (!(ex instanceof CancellationError) || !cancellation.isCancellationRequested) {
                this.trace(TraceLevel.Error, 0, `Error running client SSH session: ${ex}`);
            }
        }
    }

    /**
     * Creates an SSH server session for a client (V1 protocol), runs the session,
     * and waits for it to close.
     */
    private async connectAndRunClientSession(
        stream: any,
        cancellation: any,
    ): Promise<void> {
        if (cancellation.isCancellationRequested) {
            stream.destroy();
            throw new CancellationError();
        }

        const session = SshHelpers.createSshServerSession(this.reconnectableSessions, (config) => {
            config.protocolExtensions.push(SshProtocolExtensionNames.sessionReconnect);
            config.addService(PortForwardingService);
        });
        session.trace = this.trace;
        session.onReportProgress(
            (args) => this.raiseReportProgress(args.progress, args.sessionNumber),
            this,
            this.sshSessionDisposables);
        session.credentials = {
            publicKeys: [this.hostPrivateKey!],
        };

        const tcs = new PromiseCompletionSource<void>();

        const authenticatingEventRegistration = session.onAuthenticating((e) => {
            this.onSshClientAuthenticating(e);
        });
        session.onClientAuthenticated(() => {
            // This call is async and will catch and log any async errors.
            void this.onSshClientAuthenticated(session);
        });
        const requestRegistration = session.onRequest((e) => {
            this.onSshSessionRequest(e, session);
        });
        const channelOpeningEventRegistration = session.onChannelOpening((e) => {
            this.onSshChannelOpening(e, session);
        });
        const closedEventRegistration = session.onClosed((e) => {
            this.session_Closed(session, e, cancellation);
            tcs.resolve();
        });

        try {
            const nodeStream = new NodeStream(stream);
            await session.connect(nodeStream);
            this.sshSessions.push(session);
            cancellation.onCancellationRequested((e) => {
                tcs.reject(new CancellationError());
            });
            await tcs.promise;
        } finally {
            authenticatingEventRegistration.dispose();
            requestRegistration.dispose();
            channelOpeningEventRegistration.dispose();
            closedEventRegistration.dispose();

            await session.close(SshDisconnectReason.byApplication);
            session.dispose();
        }
    }

    private onSshClientAuthenticating(e: any) {
        if (e.authenticationType === SshAuthenticationType.clientNone) {
            // For now, the client is allowed to skip SSH authentication;
            // they must have a valid tunnel access token already to get this far.
            e.authenticationPromise = Promise.resolve({});
        } else {
            // Other authentication types are not implemented. Doing nothing here
            // results in a client authentication failure.
        }
    }

    private async onSshClientAuthenticated(session: any) {
        void this.startForwardingExistingPorts(session);
    }

    private async startForwardingExistingPorts(session: any): Promise<void> {
        const pfs = session.activateService(PortForwardingService);
        pfs.forwardConnectionsToLocalPorts = this.forwardConnectionsToLocalPorts;

        // Ports must be forwarded sequentially because the TS SSH lib
        // does not yet support concurrent requests.
        for (const port of this.tunnel?.ports ?? []) {
            this.trace(TraceLevel.Verbose, 0, `Forwarding port ${port.portNumber}`);
            try {
                // 解析远程转发数据
                this.traceInfo('forwardPort description: ' + port.description);
                if (port.description && port.description.split(':').length === 2) {
                    const remoteAddress = port.description.split(':')[0];
                    const remotePort = Number(port.description.split(':')[1]);
                    this.traceInfo('forwardPort custom remote: ' + port.description);
                    await this.forwardPort(pfs, port, remoteAddress, remotePort);
                } else {
                    await this.forwardPort(pfs, port);
                }
            } catch (ex) {
                this.traceError(`Error forwarding port ${port.portNumber}: ${ex}`);
            }
        }
    }

    private onSshSessionRequest(e: any, session: any) {
        if (e.requestType === 'RefreshPorts') {
            e.responsePromise = (async () => {
                await this.refreshPorts();
                return new SessionRequestSuccessMessage();
            })();
        }
    }

    private onSshChannelOpening(e: any, session: any) {
        if (!(e.request instanceof PortForwardChannelOpenMessage)) {
            // This is to let the Go SDK open an unused session channel
            if (e.request.channelType === SshChannel.sessionChannelType) {
                return;
            }
            this.trace(
                TraceLevel.Warning,
                0,
                'Rejecting request to open non-portforwarding channel.',
            );
            e.failureReason = SshChannelOpenFailureReason.administrativelyProhibited;
            return;
        }
        const portForwardRequest = e.request as any;
        if (portForwardRequest.channelType === 'direct-tcpip') {
            if (!this.tunnel!.ports!.some((p) => p.portNumber === portForwardRequest.port)) {
                this.trace(
                    TraceLevel.Warning,
                    0,
                    'Rejecting request to connect to non-forwarded port:' + portForwardRequest.port,
                );
                e.failureReason = SshChannelOpenFailureReason.administrativelyProhibited;
            }
        } else if (portForwardRequest.channelType === 'forwarded-tcpip') {
            const eventArgs = new ForwardedPortConnectingEventArgs(
                portForwardRequest.port, false, new SshStream(e.channel));
            super.onForwardedPortConnecting(eventArgs);
        } else {
            // For forwarded-tcpip do not check remoteForwarders because they may not be updated yet.
            // There is a small time interval in forwardPort() between the port
            // being forwarded with forwardFromRemotePort and remoteForwarders updated.
            // Setting PFS.acceptRemoteConnectionsForNonForwardedPorts to false makes PFS reject forwarding requests from the
            // clients for the ports that are not forwarded and are missing in PFS.remoteConnectors.
            // Call to pfs.forwardFromRemotePort() in forwardPort() adds the connector to PFS.remoteConnectors.
            this.trace(
                TraceLevel.Warning,
                0,
                'Nonrecognized channel type ' + portForwardRequest.channelType,
            );
            e.failureReason = SshChannelOpenFailureReason.unknownChannelType;
        }
    }

    private session_Closed(
        session: any,
        e: any,
        cancellation: any,
    ) {
        // Reconnecting client session may cause the new session to close with 'None' reason.
        if (e.reason === SshDisconnectReason.byApplication) {
            this.traceInfo('Client ssh session closed.');
        } else if (cancellation.isCancellationRequested) {
            this.traceInfo('Client ssh session cancelled.');
        } else if (e.reason !== SshDisconnectReason.none) {
            this.traceError(
                `Client ssh session closed unexpectedly due to ${e.reason}, "${e.message}"\n${e.error}`,
            );
        }

        for (const [key, forwarder] of this.remoteForwarders.entries()) {
            if (forwarder.session === session) {
                forwarder.dispose();
                this.remoteForwarders.delete(key);
            }
        }

        const index = this.sshSessions.indexOf(session);
        if (index >= 0) {
            this.sshSessions.splice(index, 1);
        }
    }

    public async refreshPorts(cancellation?: any): Promise<void> {
        this.raiseReportProgress(TunnelProgress.StartingRefreshPorts);
        if (!await this.refreshTunnel(true, cancellation)) {
            return;
        }

        const ports = this.tunnel?.ports ?? [];

        let sessions: any[] = this.sshSessions;
        if (this.connectionProtocol === webSocketSubProtocolv2 && this.sshSession) {
            // In the V2 protocol, ports are forwarded directly on the host session.
            // (But even when the host is V2, some clients may still connect with V1.)
            sessions = [...sessions, this.sshSession];
        }

        const forwardPromises: Promise<any>[] = [];

        for (const port of ports) {
            // For all sessions which are connected and authenticated, forward any added/updated
            // ports. For sessions that are not yet authenticated, the ports will be forwarded
            // immediately after authentication completes - see onSshClientAuthenticated().
            // (Session requests may not be sent before the session is authenticated, for sessions
            // that require authentication; For V2 sessions that are not encrypted/authenticated
            // at all, the session ID is null.)
            for (const session of sessions.filter(
                (s) => s.isConnected && (!s.sessionId || s.principal))) {
                const key = new SessionPortKey(session.sessionId, Number(port.portNumber));
                const forwarder = this.remoteForwarders.get(key.toString());
                if (!forwarder) {
                    const pfs = session.getService(PortForwardingService)!;
                    // 解析远程转发数据
                    this.traceInfo('port description: ' + port.description);
                    if (port.description && port.description.split(':').length === 2) {
                        const remoteAddress = port.description.split(':')[0];
                        const remotePort = Number(port.description.split(':')[1]);
                        forwardPromises.push(this.forwardPort(pfs, port, remoteAddress, remotePort));
                    } else {
                        forwardPromises.push(this.forwardPort(pfs, port));
                    }
                }
            }
        }

        for (const [key, forwarder] of Object.entries(this.remoteForwarders)) {
            if (!ports.some((p) => p.portNumber === forwarder.localPort)) {
                this.remoteForwarders.delete(key);
                forwarder.dispose();
            }
        }

        await Promise.all(forwardPromises);
        this.raiseReportProgress(TunnelProgress.CompletedRefreshPorts);
    }

    protected async forwardPort(pfs: any, port: any, remoteAddress = null, remotePort = null) {
        const portNumber = Number(port.portNumber);
        if (pfs.localForwardedPorts.find((p) => p.localPort === portNumber)) {
            // The port is already forwarded. This may happen if we try to add the same port twice after reconnection.
            return;
        }
        if (!remoteAddress) remoteAddress = 'localhost';
        if (!remotePort) remotePort = portNumber;
        // When forwarding from a Remote port we assume that the RemotePortNumber
        // and requested LocalPortNumber are the same.
        const forwarder = await pfs.forwardFromRemotePort(
            this.loopbackIp,
            portNumber,
            remoteAddress,
            remotePort
        );
        if (!forwarder) {
            // The forwarding request was rejected by the client.
            return;
        }

        const key = new SessionPortKey(pfs.session.sessionId, Number(forwarder.localPort));
        this.remoteForwarders.set(key.toString(), forwarder);
    }
}
