import React, { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext();

const socket = io("http://localhost:5000");

const ContextProvider = ({ children }) => {
	const [stream, setStream] = useState(null);
	const [me, setMe] = useState("");
	const [call, setCall] = useState({});
	const [callAccepted, setCallAccepted] = useState(false);
	const [callEnded, setCallEnded] = useState(false);
	const [name, setName] = useState("");

	const myVideo = useRef();
	const userVideo = useRef();
	const connectionRef = useRef();

	useEffect(() => {
		navigator.mediaDevices
			.getUserMedia({ video: true, audio: true })
			.then((currentStream) => {
				setStream(currentStream);

				myVideo.current.srcObject = currentStream;
			});

		socket.on("me", (id) => setMe(id));
		// ? 3. Get information from a person who called, then update call.
		socket.on("calluser", ({ from, name: callerName, signal }) => {
			setCall({ isReceivedCall: true, from, name: callerName, signal });
		});
	}, []);

	const answerCall = () => {
		setCallAccepted(true);

		const peer = new Peer({ initiator: false, trickle: false, stream });

		peer.on("signal", (data) => {
			// ? 4. Accept call and send approved signal to the person who called.
			socket.emit("answercall", { signal: data, to: call.from });
		});

		peer.on("stream", (currentStream) => {
			// ? 4. Get the person's video who called.
			userVideo.current.srcObject = currentStream;
		});

		// ? 4. Get connected.
		peer.signal(call.signal);

		connectionRef.current = peer;
	};

	const callUser = (id) => {
		const peer = new Peer({ initiator: true, trickle: false, stream });

		peer.on("signal", (data) => {
			// ? 1. Emitting information(target id, signal, my name, my id);
			socket.emit("calluser", {
				userToCall: id,
				signalData: data,
				from: me,
				name,
			});
		});

		peer.on("stream", (currentStream) => {
			// ? 6. If signal is approved can get connected.
			userVideo.current.srcObject = currentStream;
		});

		// ? 6. The person who called gets the information "approved".
		socket.on("callaccepted", (signal) => {
			setCallAccepted(true);

			// ? 6. Get connected.
			peer.signal(signal);
		});

		connectionRef.current = peer;
	};

	const leaveCall = () => {
		setCallEnded(true);
		connectionRef.current.destroy();
		// ? Reload the page, assign new id. It is impossible to assign new id right away after hanging up first call.
		window.location.reload();
	};

	return (
		<SocketContext.Provider
			value={{
				call,
				callAccepted,
				myVideo,
				userVideo,
				stream,
				name,
				setName,
				callEnded,
				me,
				callUser,
				leaveCall,
				answerCall,
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};

export { ContextProvider, SocketContext };
