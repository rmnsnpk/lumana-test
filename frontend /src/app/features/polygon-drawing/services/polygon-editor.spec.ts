import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { PolygonActions } from '../store/polygon.actions';
import { polygonsFeature } from '../store/polygon.reducer';
import { PolygonEditor } from './polygon-editor';

const IMAGE_ID = 7;

describe('PolygonEditor', () => {
  let editor: PolygonEditor;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PolygonEditor,
        provideMockStore({
          initialState: { [polygonsFeature.name]: { ids: [], entities: {} } },
        }),
      ],
    });

    editor = TestBed.inject(PolygonEditor);
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    editor.attach(IMAGE_ID);
  });

  it('does not close a draft with fewer than three points', () => {
    editor.addDraftPoint({ x: 0.1, y: 0.1 });
    editor.addDraftPoint({ x: 0.2, y: 0.2 });
    editor.closeDraft();

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(editor.draftPoints()).toHaveLength(2);
  });

  it('stores a closed draft as a polygon of the attached image', () => {
    const points = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.1 },
      { x: 0.3, y: 0.4 },
    ];
    points.forEach((point) => editor.addDraftPoint(point));
    editor.closeDraft();

    expect(store.dispatch).toHaveBeenCalledWith(
      PolygonActions.polygonAdded({
        polygon: expect.objectContaining({ imageId: IMAGE_ID, points }),
      }),
    );
    expect(editor.draftPoints()).toEqual([]);
  });

  it('removes the last draft point', () => {
    editor.addDraftPoint({ x: 0.1, y: 0.1 });
    editor.addDraftPoint({ x: 0.2, y: 0.2 });
    editor.removeLastDraftPoint();

    expect(editor.draftPoints()).toEqual([{ x: 0.1, y: 0.1 }]);
  });

  it('dispatches updated points for a transformed polygon', () => {
    const points = [{ x: 0.3, y: 0.3 }];
    editor.updatePolygon('polygon-1', points, Math.PI);

    expect(store.dispatch).toHaveBeenCalledWith(
      PolygonActions.polygonUpdated({ id: 'polygon-1', points, rotation: Math.PI }),
    );
  });

  it('removes the selected polygon and clears the selection', () => {
    editor.selectPolygon('polygon-1');
    editor.removeSelectedPolygon();

    expect(store.dispatch).toHaveBeenCalledWith(PolygonActions.polygonRemoved({ id: 'polygon-1' }));
    expect(editor.selectedPolygonId()).toBeNull();
  });

  it('drops the selection when a new drawing starts', () => {
    editor.selectPolygon('polygon-1');
    editor.addDraftPoint({ x: 0.1, y: 0.1 });

    expect(editor.selectedPolygonId()).toBeNull();
  });

  it('draws new polygons in the picked colour', () => {
    editor.changeColor('#ff0000');
    [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.1 },
      { x: 0.3, y: 0.4 },
    ].forEach((point) => editor.addDraftPoint(point));
    editor.closeDraft();

    expect(store.dispatch).toHaveBeenCalledWith(
      PolygonActions.polygonAdded({ polygon: expect.objectContaining({ color: '#ff0000' }) }),
    );
    expect(editor.activeColor()).toBe('#ff0000');
  });

  it('recolours the selected polygon', () => {
    editor.selectPolygon('a');
    editor.changeColor('#00ff00');

    expect(store.dispatch).toHaveBeenCalledWith(
      PolygonActions.polygonRecolored({ id: 'a', color: '#00ff00' }),
    );
  });
});
