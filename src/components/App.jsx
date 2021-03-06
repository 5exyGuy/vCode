import React, { Component } from 'react';
import MonacoEditor from 'react-monaco-editor';
import * as monaco from 'monaco-editor';
import { altVClient } from '../types/altv-client';
import { altVServer } from '../types/altv-server';
import { natives } from '../types/natives';
import './App.css';
import { Rnd } from 'react-rnd';
import { FaFileCode, FaServer, FaLaptopCode } from 'react-icons/fa';
import vCodeLight from '../assets/images/vCodeLight.png';
import vCodeDark from '../assets/images/vCodeDark.png';
import { ContextMenu, MenuItem, ContextMenuTrigger } from 'react-contextmenu';
import { Layout, Result } from 'antd';
import { IoMdCloudyNight, IoMdPartlySunny } from 'react-icons/io';
import { Window, TitleBar } from 'react-desktop/windows';

const { Header, Sider, Content } = Layout;

export default class App extends Component {

    state = {
        prevWidth: 800,
        prevHeight: 400,
        isMaximized: false,
        width: 800,
        height: 400,
        prevX: 200,
        prevY: 200,
        x: 200,
        y: 200,
        code: '',
        theme: 'dark',
        currentPage: 'editor',
        currentFileName: null,
        renamingFile: false,
        files: [],
        success: '',
        error: ''
    };

    itemActions = {
        serverFile: () => {
            this.createNewFile('server');
        },
        clientFile: () => {
            this.createNewFile('client');
        },
        dark: () => {
            this.setState({ theme: 'dark' });
        },
        light: () => {
            this.setState({ theme: 'light' });
        },
        snippets: () => {
            this.setState({ 
                currentPage: 'snippets',
                currentFileName: null
            });
        }
    };

    pages = {
        none: <Result
            icon={<img src={this.state.theme === 'dark' ? vCodeDark : vCodeLight} height='80vh' />}
            subTitle={
                <div style={{ color: this.state.theme === 'dark' ? 'white' : 'rgba(0, 0, 0, 0.45)' }}>
                    To get started, press the menu button at the top called 'File' and select the type of file you want to create or just right click on the left panel.
                    <p style={{ color: '#52a3ff', marginTop: '30px' }}>Author: 5exyGuy</p>
                </div>}
        />,
        editor: <MonacoEditor
            width={parseInt(this.state.width) - 200}
            height={parseInt(this.state.height) - 67}
            language='javascript'
            theme={this.state.theme === 'dark' ? 'vs-dark' : 'vs'}
            value={this.state.code}
            onChange={this.onCodeChange.bind(this)}
            editorDidMount={this.editorDidMount.bind(this)}
        />
    };

    componentDidMount() {
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false
        });

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES6,
            allowNonTsExtensions: true
        });

        setTimeout(() => {
            this.setState({ currentPage: 'none' });
            if ('alt' in window) {
                alt.emit('vcode::ready');
                this.ready = true;
            }
        }, 200);
    }

    editorDidMount(editor) {
        this.editor = editor;
    }

    onDrag(e, d) {
        this.setState({ x: d.x, y: d.y });
    }

    onResize(e, direction, ref, delta, position) {
        this.setState({
            width: ref.style.width,
            height: ref.style.height,
            ...position
        });
    }

    maximizeWindow() {
        if (this.state.isMaximized) {
            this.setState({
                width: this.state.prevWidth,
                height: this.state.prevHeight,
                x: this.state.prevX,
                y: this.state.prevY,
                isMaximized: false
            });
            return;
        }

        this.setState({
            prevHeight: this.state.height,
            prevWidth: this.state.width,
            width: window.innerWidth,
            height: window.innerHeight,
            prevX: this.state.x,
            prevY: this.state.y,
            x: 0,
            y: 0,
            isMaximized: true
        });
    }

    minimizeWindow() {
        if (this.ready) alt.emit('vcode::close');
    }

    closeWindow() {
        if (this.ready) alt.emit('vcode::close');
    }
    
    onCodeChange(newValue) {
        this.setState({ code: newValue });
    }

    executeFile(fileName) {
        if (this.ready) {
            this.editFile(fileName);
            const files = [...this.state.files];
            const file = files.find((file) => {
                return file.name === fileName;
            });

            if (!file) return;

            const errors = monaco.editor.getModelMarkers();

            if (errors.length > 0) {
                return;
            }

            alt.emit('vscode::execute', file.type, file.code);
        }
    }

    editFile(fileName) {
        if (this.state.currentFile !== fileName) this.saveCurrentFile();

        const files = [...this.state.files];

        files.map((file) => {
            if (file.selected === true) {
                file.selected = false;
                return;
            }
        });

        let code = '';
        let type = '';

        files.map((file) => {
            if (file.name === fileName) {
                file.selected = true;
                code = file.code;
                type = file.type;
                return;
            }
        });

        this.saveCurrentFile();

        this.setState({ 
            currentFileName: fileName,
            files: [...files],
            currentPage: 'editor',
            code: code
        });

        if (this.editor) {
            if (type === 'server') monaco.languages.typescript.javascriptDefaults.setExtraLibs([ { content: altVServer } ]);
            else monaco.languages.typescript.javascriptDefaults.setExtraLibs([ { content: altVClient }, { content: natives } ]);
            this.editor.focus();
        }
    }

    renameFile(fileName) {
        const files = [...this.state.files];

        files.map((file) => {
            if (file.name === fileName) {
                file.renaming = true;
                return;
            }
        });

        this.setState({
            files: [...files],
            renamingFile: true
        });
    }

    deleteFile(fileName) {
        const files = [...this.state.files];

        const index = files.findIndex((file) => {
            return file.name === fileName;
        });
        if (index > -1) files.splice(index, 1);

        this.setState({
            files: [...files]
        });
    }

    onContextCreateFile(type) {
        this.createNewFile(type);
    }

    createNewFile(fileType) {
        const files = [...this.state.files];

        const index = files.findIndex((file) => {
            return file.new === true || file.renaming === true;
        });

        if (index > -1) files.splice(index, 1);

        const file = {
            name: '',
            type: fileType,
            code: '',
            ref: null,
            renaming: false,
            new: true
        };

        files.unshift(file);
        this.setState({ 
            files: [...files]
        });
    }

    componentDidUpdate() {
        this.state.files.map((file) => {
            if (file.new || file.renaming) { 
                file.ref.focus();
                return;
            }
        });
    }

    inputBlur(event) {
        if (this.pressedEnter) return;
        
        this.createFileAfterInput(event);
    }

    createFileAfterInput(event) {
        const files = [...this.state.files];

        if (this.state.renamingFile) {
            if (event.target.value.length > 0) {
                const file = files.map((file) => {
                    if (file.renaming) {
                        file.name = event.target.value;
                        file.renaming = false;
                        return;
                    }
                });

                this.setState({
                    files: [...files],
                    renamingFile: false
                });
                return;
            }

            const file = files.map((file) => {
                if (file.renaming) {
                    file.renaming = false;
                    return;
                }
            });

            this.setState({
                files: [...files],
                renamingFile: false
            });
            return;
        }

        if (event.target.value.length > 0) {
            const result = files.find((file) => {
                return file.name === event.target.value;
            });

            if (result) {
                files.shift();
                this.setState({ files: [...files] });
                return;
            }

            const file = files[0];
            file.name = event.target.value;
            file.code = `// ${file.name}`
            file.new = false;
            files[0] = file;

            this.saveCurrentFile();

            this.setState({ 
                files: [...files], 
                currentPage: 'editor', 
                currentFileName: file.name,
                code: file.code
            });

            if (this.editor) {
                if (file.type === 'server') monaco.languages.typescript.javascriptDefaults.setExtraLibs([ { content: altVServer } ]);
                else monaco.languages.typescript.javascriptDefaults.setExtraLibs([ { content: altVClient }, { content: natives } ]);
                this.editor.focus();
            }
            return;
        } 
        files.shift();
        this.setState({ 
            files: [...files], 
            currentPage: this.state.currentFileName === null ? 'none' : 'editor'
        });

        if (this.editor) this.editor.focus();
    }

    inputKeyPress(event) {
        if (event.key === 'Enter') { 
            this.pressedEnter = true;
            this.createFileAfterInput(event);
            this.pressedEnter = false;
        }
    }

    saveCurrentFile() {
        if (this.state.currentFile !== null) {
            const files = [...this.state.files];

            files.map((file) => {
                if (this.state.currentFileName === file.name) {
                    file.code = this.state.code;
                    return;
                }
            });
        }
    }

    doubleClickOnFile(fileName) {
        this.editFile(fileName);
    }

    render() {
        const currentPage = this.pages[this.state.currentPage];
        const width = this.state.width;
        const height = this.state.height;
        const theme = this.state.theme;
        
        return (
            <div>
                <Rnd
                    size={{ width: width, height: height }}
                    position={{ x: this.state.x, y: this.state.y }}
                    onDrag={this.onDrag.bind(this)}
                    onDragStop={this.onDrag.bind(this)}
                    onDragStart={this.onDrag.bind(this)}
                    onResize={this.onResize.bind(this)}
                    onResizeStart={this.onResize.bind(this)}
                    onResizeStop={this.onResize.bind(this)}
                    minWidth={600}
                    minHeight={300}
                    bounds='body'
                    cancel='.no-drag'
                >
                    <Window
                        theme={theme}
                        chrome
                        height={height}
                        width={width}
                    >
                        <TitleBar title={
                                <div>
                                    <span className='icon'><FaFileCode /></span>
                                    <span> vCode {this.state.currentFileName ? `(${this.state.currentFileName})` : '' }</span>
                                </div>
                            }
                            controls
                            onCloseClick={this.closeWindow.bind(this)}
                            onMaximizeClick={this.maximizeWindow.bind(this)}
                            onMinimizeClick={this.minimizeWindow.bind(this)}
                        />
                        <Layout className='no-drag' style={{ height: height - 31, width: width - 2 }}>
                            <ContextMenuTrigger id='sider'>
                                <Sider style={{ height: '100%', backgroundColor: theme === 'dark' ? '#252525' : '#f8f8f8' }}>
                                    <img src={theme === 'dark' ? vCodeDark : vCodeLight} height='50vh' style={{ margin: '20px 50px' }} />
                                    {/* <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> */} 
                                    <div className='leftPanel' style={{ height: height - 81 }}>
                                    {this.state.files.map((file) => {
                                        if (!file.new && !file.renaming) 
                                            return (
                                                <ContextMenuTrigger key={file.name} id={file.name}>
                                                    <div
                                                        key={file.name}
                                                        onDoubleClick={this.doubleClickOnFile.bind(this, file.name)} 
                                                        className={`vfile ${theme} ${this.state.currentFileName === file.name ? 'vselected' : ''}`}
                                                    >
                                                        {file.type === 'server' ? <FaServer color='#49a5d6' /> : <FaLaptopCode color='#368a3d' />} {file.name}
                                                    </div>
                                                </ContextMenuTrigger>
                                            ); 

                                        return (<input
                                            key={file.name}
                                            onKeyPress={this.inputKeyPress.bind(this)}
                                            onBlur={this.inputBlur.bind(this)}
                                            ref={(input) => file.ref = input} 
                                            style={{ 
                                                padding: '0px 5px', 
                                                border: '0',
                                                display: 'block',
                                                width: '100%'
                                            }}
                                        />);
                                    })} 
                                    </div>
                                </Sider>
                            </ContextMenuTrigger>
                            <Layout style={{ height: height - 31 }}>
                                <Header style={{ padding: '0', height: 'auto', lineHeight: '20px' }}>
                                    <ul className='h-menu' 
                                        style={{ 
                                            width: width - 200, 
                                            backgroundColor: theme === 'dark' ? 'rgb(50, 50, 50)' : '#f8f8f8',
                                            color: theme === 'dark' ? 'rgb(150, 150, 150)' : ' #1d1d1d'
                                        }}
                                    >
                                        <li key='file'>
                                            <a className='dropdown-toggle'>File</a>
                                            <ul className='d-menu' data-role='dropdown' 
                                                style={{ 
                                                    backgroundColor: theme === 'dark' ? 'rgb(60, 60, 60)' : '#f8f8f8',
                                                    color: theme === 'dark' ? 'rgb(180, 180, 180)' : ' #1d1d1d'
                                                }}
                                            >
                                                <li key='serverFile'>
                                                    <a onClick={this.itemActions['serverFile'].bind(this)}>
                                                        <span className='icon' style={{ top: '25%' }}><FaServer /></span>New Server File...
                                                    </a>
                                                </li>
                                                <li key='clientFile'>
                                                    <a onClick={this.itemActions['clientFile'].bind(this)}>
                                                    <span className='icon' style={{ top: '25%' }}><FaLaptopCode /></span>New Client File...
                                                    </a>
                                                </li>
                                            </ul>
                                        </li>
                                        <li key='theme'>
                                            <a className='dropdown-toggle'>Theme</a>
                                            <ul className='d-menu' data-role='dropdown'
                                                style={{ 
                                                    backgroundColor: theme === 'dark' ? 'rgb(60, 60, 60)' : '#f8f8f8',
                                                    color: theme === 'dark' ? 'rgb(180, 180, 180)' : ' #1d1d1d'
                                                }}
                                            >
                                                <li key='dark'>
                                                    <a onClick={this.itemActions['dark'].bind(this)}>
                                                    <span className='icon' style={{ top: '25%' }}><IoMdCloudyNight /></span>Dark
                                                    </a>
                                                </li>
                                                <li key='light'>
                                                <a onClick={this.itemActions['light'].bind(this)}>
                                                    <span className='icon' style={{ top: '25%' }}><IoMdPartlySunny /></span>Light
                                                </a>
                                            </li>
                                            </ul>
                                        </li>
                                        {this.state.currentFileName || this.state.currentPage === 'editor' ? 
                                            <li key='execute'><a onClick={this.executeFile.bind(this, this.state.currentFileName)}>Execute</a></li> 
                                            : ''}
                                    </ul>
                                </Header>
                                <Content style={{ 
                                        height: height - 62,
                                        backgroundColor: theme === 'dark' ? '#1e1e1e' : 'white'
                                    }}
                                >
                                    {currentPage}
                                </Content>
                            </Layout>
                        </Layout>
                    </Window>
                </Rnd>

                <ContextMenu id='sider'>
                    <MenuItem onClick={this.createNewFile.bind(this, 'server')}>New Server File...</MenuItem>
                    <MenuItem onClick={this.createNewFile.bind(this, 'client')}>New Client File...</MenuItem>
                </ContextMenu>
                {this.state.files.map((file) => {
                    return (<ContextMenu key={file.name} id={file.name}>
                        <MenuItem onClick={this.executeFile.bind(this, file.name)}>Execute</MenuItem>
                        <MenuItem onClick={this.editFile.bind(this, file.name)}>Edit</MenuItem>
                        <MenuItem onClick={this.renameFile.bind(this, file.name)}>Rename</MenuItem>
                        <MenuItem onClick={this.deleteFile.bind(this, file.name)}>Delete</MenuItem>
                    </ContextMenu>);
                })}
            </div>
        );
    }

}