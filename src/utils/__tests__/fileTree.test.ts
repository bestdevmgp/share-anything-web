import { buildFileTree, collectFileIds, TreeFolder, TreeFile } from '../fileTree';

const f = (id: string, name: string, rel: string) => ({
  id,
  file_name: name,
  file_size: 1,
  relative_path: rel,
});

const folder = (tree: ReturnType<typeof buildFileTree>, name: string) =>
  tree.find((n): n is TreeFolder => n.kind === 'folder' && n.name === name)!;

describe('buildFileTree — top-level grouping that drives folder/zip downloads', () => {
  it('loose files only → every node is a top-level file', () => {
    const tree = buildFileTree([f('1', 'a.txt', ''), f('2', 'b.txt', '')], []);
    expect(tree.length).toBe(2);
    expect(tree.every((n) => n.kind === 'file')).toBe(true);
  });

  it('one folder with files → a single top-level folder holding the files', () => {
    const tree = buildFileTree([f('1', 'a.txt', 'folderA/a.txt'), f('2', 'b.txt', 'folderA/b.txt')], []);
    expect(tree.length).toBe(1);
    expect(tree[0].kind).toBe('folder');
    expect(folder(tree, 'folderA').name).toBe('folderA');
    expect(collectFileIds(tree[0]).sort()).toEqual(['1', '2']);
  });

  it('two folders → two independent top-level folders (individual = one zip each)', () => {
    const tree = buildFileTree([f('1', 'a', 'A/a'), f('2', 'b', 'B/b')], []);
    const folders = tree.filter((n): n is TreeFolder => n.kind === 'folder');
    expect(folders.map((x) => x.name).sort()).toEqual(['A', 'B']);
    expect(collectFileIds(folder(tree, 'A'))).toEqual(['1']);
    expect(collectFileIds(folder(tree, 'B'))).toEqual(['2']);
  });

  it('folder + loose file → folder zipped, loose file stays loose at the top level', () => {
    const tree = buildFileTree([f('1', 'a', 'A/a'), f('2', 'loose.txt', '')], []);
    expect(tree.some((n) => n.kind === 'folder' && n.name === 'A')).toBe(true);
    const loose = tree.find((n): n is TreeFile => n.kind === 'file' && n.id === '2');
    expect(loose).toBeTruthy();
  });

  it('nested folders → structure preserved under the top-level folder', () => {
    const tree = buildFileTree([f('1', 'x', 'A/sub/x'), f('2', 'y', 'A/y')], []);
    const A = folder(tree, 'A');
    const sub = A.children.find((n): n is TreeFolder => n.kind === 'folder' && n.name === 'sub')!;
    expect(sub.kind).toBe('folder');
    expect(collectFileIds(A).sort()).toEqual(['1', '2']);
  });

  it('empty folder → a childless top-level folder node', () => {
    const tree = buildFileTree([], ['emptyA']);
    expect(tree.length).toBe(1);
    expect(tree[0].kind).toBe('folder');
    expect((tree[0] as TreeFolder).children.length).toBe(0);
  });

  it('same-named files in different folders → no collision, each under its own folder', () => {
    const tree = buildFileTree([f('1', 'x.jpg', 'A/x.jpg'), f('2', 'x.jpg', 'B/x.jpg')], []);
    expect(collectFileIds(folder(tree, 'A'))).toEqual(['1']);
    expect(collectFileIds(folder(tree, 'B'))).toEqual(['2']);
  });
});
