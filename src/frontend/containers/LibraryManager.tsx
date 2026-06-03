import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import path from 'path';
import React, { useCallback, useEffect, useState } from 'react';
import { RendererMessenger } from 'src/ipc/renderer';
import type { LibraryEntry } from 'src/ipc/messages';
import { Button, ButtonGroup, IconSet } from 'widgets';
import { Alert, DialogButton } from 'widgets/popovers';
import FileInput from '../components/FileInput';
import PopupWindow from '../components/PopupWindow';
import { useStore } from '../contexts/StoreContext';

const LibraryManager = observer(() => {
  const { uiStore } = useStore();
  if (!uiStore.isLibraryManagerOpen) return null;
  return (
    <PopupWindow onClose={uiStore.closeLibraryManager} windowName="library-manager" closeOnEscape>
      <div id="library-manager" className={uiStore.theme}>
        <LibraryManagerContent />
      </div>
    </PopupWindow>
  );
});

export default LibraryManager;

const LibraryManagerContent = () => {
  const [libraries, setLibraries] = useState<LibraryEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [newName, setNewName] = useState('');
  const [newFolderPath, setNewFolderPath] = useState('');
  const [addError, setAddError] = useState('');
  const [switchTarget, setSwitchTarget] = useState<LibraryEntry | null>(null);

  const refresh = useCallback(() => {
    const { entries, currentPath: cp } = RendererMessenger.getLibraries();
    setLibraries(entries);
    setCurrentPath(cp);
  }, []);

  useEffect(refresh, [refresh]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      setAddError('Please enter a library name.');
      return;
    }
    if (!newFolderPath) {
      setAddError('Please choose a folder for the library.');
      return;
    }
    setAddError('');
    const result = await RendererMessenger.createLibrary({
      name: newName.trim(),
      path: newFolderPath,
    });
    if ('error' in result) {
      setAddError(result.error);
    } else {
      setNewName('');
      setNewFolderPath('');
      refresh();
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <>
      <h2>Libraries</h2>

      <div className="library-current-path">
        <span className="library-label">Current folder:</span>
        <button
          className="library-path-link"
          onClick={() => shell.showItemInFolder(currentPath)}
          title="Show in Finder / Explorer"
        >
          {currentPath}
        </button>
      </div>

      <h3>Add a Library</h3>
      <div className="library-add-form">
        <div className="library-add-row">
          <input
            type="text"
            className="library-name-input"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleAddKeyDown}
          />
          <FileInput
            className="btn-outlined"
            options={{ properties: ['openDirectory'] }}
            onChange={([dir]) => setNewFolderPath(dir)}
          >
            {newFolderPath ? path.basename(newFolderPath) : 'Choose folder…'}
          </FileInput>
          <Button text="Add" onClick={handleAdd} styling="outlined" icon={IconSet.PLUS} />
        </div>
        {addError && <p className="library-error">{addError}</p>}
        {newFolderPath && (
          <p className="library-add-path-preview">{newFolderPath}</p>
        )}
      </div>

      <h3>Known Libraries</h3>
      <ul className="library-list">
        {libraries.length === 0 && (
          <li className="library-empty">
            No libraries registered yet. Add one above or switch to get started.
          </li>
        )}
        {libraries.map((lib) => (
          <LibraryItem
            key={lib.id}
            lib={lib}
            isCurrent={lib.path === currentPath}
            onSwitch={setSwitchTarget}
            onRefresh={refresh}
          />
        ))}
      </ul>

      <Alert
        open={switchTarget !== null}
        title={`Switch to "${switchTarget?.name}"?`}
        primaryButtonText="Switch & Restart"
        onClick={(button) => {
          if (button === DialogButton.PrimaryButton && switchTarget) {
            RendererMessenger.switchLibrary({ path: switchTarget.path });
          }
          setSwitchTarget(null);
        }}
      >
        <p>Allusion will restart to load this library. Unsaved changes will be lost.</p>
        <p className="library-switch-path">{switchTarget?.path}</p>
      </Alert>
    </>
  );
};

type LibraryItemProps = {
  lib: LibraryEntry;
  isCurrent: boolean;
  onSwitch: (lib: LibraryEntry) => void;
  onRefresh: () => void;
};

const LibraryItem = ({ lib, isCurrent, onSwitch, onRefresh }: LibraryItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(lib.name);

  const startRename = () => {
    setRenameValue(lib.name);
    setIsRenaming(true);
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== lib.name) {
      await RendererMessenger.renameLibrary({ id: lib.id, name: trimmed });
      onRefresh();
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setRenameValue(lib.name);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') cancelRename();
  };

  const handleRemove = async () => {
    await RendererMessenger.removeLibrary({ id: lib.id });
    onRefresh();
  };

  return (
    <li className="library-item" aria-current={isCurrent ? 'true' : undefined}>
      <div className="library-item-info">
        {isRenaming ? (
          <div className="library-rename-row">
            <input
              className="library-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              autoFocus
            />
            <Button text="Save" onClick={commitRename} styling="outlined" />
            <Button text="Cancel" onClick={cancelRename} styling="outlined" />
          </div>
        ) : (
          <span className="library-item-name">
            {lib.name}
            {isCurrent && <span className="library-item-badge">current</span>}
          </span>
        )}
        <span className="library-item-path">{lib.path}</span>
      </div>
      <ButtonGroup>
        {!isCurrent ? (
          <Button
            text="Switch"
            onClick={() => onSwitch(lib)}
            styling="outlined"
            icon={IconSet.RELOAD}
          />
        ) : undefined}
        {!isRenaming ? (
          <Button
            text="Rename"
            onClick={startRename}
            styling="outlined"
            icon={IconSet.REPLACE}
          />
        ) : undefined}
        <Button
          text="Remove"
          onClick={handleRemove}
          styling="outlined"
          icon={IconSet.CLEAR_DATABASE}
          disabled={isCurrent}
          tooltip={isCurrent ? 'Cannot remove the active library' : undefined}
        />
      </ButtonGroup>
    </li>
  );
};
